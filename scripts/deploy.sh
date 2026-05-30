#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# ==============================================================================
# Configuration Variables
# ==============================================================================

# Replace with your actual Google Cloud Project ID
PROJECT_ID="your-gcp-project-id"

# The name of your Cloud Run service
SERVICE_NAME="ops360-app"

# Region for deployment (e.g., me-central1 or me-central2 for Saudi Arabia)
REGION="me-central1"

# The name of the Docker image in Google Container Registry (GCR) or Artifact Registry
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "======================================================"
echo "Starting deployment for $SERVICE_NAME"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Image: $IMAGE_NAME"
echo "======================================================"

# ==============================================================================
# Step 1: Build the Docker Image using Google Cloud Build
# ==============================================================================
echo "[1/2] Submitting build to Google Cloud Build..."

# Ensure we are authenticated and using the correct project
gcloud config set project $PROJECT_ID

# Submit the build
gcloud builds submit --tag $IMAGE_NAME .

echo "Build successful!"

# ==============================================================================
# Step 2: Deploy to Google Cloud Run
# ==============================================================================
echo "[2/2] Deploying to Google Cloud Run..."

gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --port 3000

echo "======================================================"
echo "Deployment Complete!"
echo "======================================================"
