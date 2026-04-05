# OPS360 GCP Migration Script (v2 - Fixed)
# This version automates secret extraction to prevent terminal paste errors.
# It also uses cloudbuild.yaml for formal build-arg support.

# Project Settings
$PROJECT_ID="ops360-492012"
$REGION="asia-south1"
$REPO_NAME="ops360-repo"
$APP_NAME="ops360-app"
$SERVICE_NAME="ops360-service"

Write-Host "--- 🚀 OPS360 GCP Migration (Fix v2) Start ---" -ForegroundColor Yellow

# [1/5] Extracting Keys from .env.local
Write-Host "[1/5] Extracting keys from .env.local..." -ForegroundColor Cyan
if (Test-Path ".env.local") {
    $env_content = Get-Content ".env.local" -Raw
    $SUPABASE_URL = ([regex]::Match($env_content, '(?m)^NEXT_PUBLIC_SUPABASE_URL=(.*)').Groups[1].Value).Trim()
    $SUPABASE_ANON = ([regex]::Match($env_content, '(?m)^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)').Groups[1].Value).Trim()
    $ROLE_KEY = ([regex]::Match($env_content, '(?m)^SUPABASE_SERVICE_ROLE_KEY=(.*)').Groups[1].Value).Trim()
    Write-Host "✅ Keys successfully extracted." -ForegroundColor Green
} else {
    Write-Error ".env.local not found! Please ensure it exists in the root directory."
    exit 1
}

# [2/5] Enabling GCP APIs
Write-Host "[2/5] Ensuring GCP APIs are enabled..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com --project $PROJECT_ID

# [3/5] Setting up Infrastructure
Write-Host "[3/5] Syncing Infrastructure..." -ForegroundColor Cyan
# Repository
gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="OPS360 Image Repository" --project $PROJECT_ID 2>$null

# Secret Manager
$secretExists = gcloud secrets list --filter="name:SUPABASE_SERVICE_ROLE_KEY" --project $PROJECT_ID --format="value(name)"
if (-not $secretExists) {
    Write-Host "Creating new secret..."
    Write-Output $ROLE_KEY | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=- --replication-policy="automatic" --project $PROJECT_ID
} else {
    Write-Host "Adding new version to existing secret..."
    Write-Output $ROLE_KEY | gcloud secrets versions add SUPABASE_SERVICE_ROLE_KEY --data-file=- --project $PROJECT_ID
}

# [3.5/5] Granting IAM permissions for Secret Access
Write-Host "[3.5/5] Granting Secret Accessor permissions..." -ForegroundColor Cyan
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding "SUPABASE_SERVICE_ROLE_KEY" `
    --member="serviceAccount:${SERVICE_ACCOUNT}" `
    --role="roles/secretmanager.secretAccessor" `
    --project $PROJECT_ID

# [4/5] Executing Cloud Build
Write-Host "[4/5] Executing Cloud Build with cloudbuild.yaml..." -ForegroundColor Cyan
gcloud builds submit . --config cloudbuild.yaml `
  --substitutions="_SUPABASE_URL=${SUPABASE_URL},_SUPABASE_ANON_KEY=${SUPABASE_ANON},_REGION=${REGION},_REPO_NAME=${REPO_NAME},_APP_NAME=${APP_NAME}" `
  --project $PROJECT_ID

# [5/5] Deploying to Cloud Run
Write-Host "[5/5] Deploying Cloud Run Service..." -ForegroundColor Cyan
try {
    gcloud run deploy $SERVICE_NAME `
      --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${APP_NAME}:latest" `
      --region $REGION `
      --set-secrets=SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest `
      --port 3000 `
      --allow-unauthenticated `
      --project $PROJECT_ID
    
    Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
    Write-Host "Verify the service at the URL output by the deploy command." -ForegroundColor Yellow
} catch {
    Write-Host "❌ Deployment failed. Please check the error logs above." -ForegroundColor Red
}
