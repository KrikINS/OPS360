# AppTerra Deployment Runbook

**Rule: Code is shared, Data is isolated. ALL new development happens on the `dev` branch.**

## Production Deployment Sequence
Whenever features on the `dev` branch have been tested and approved in the staging environment (`ops360-dev.myappterra.com`), execute this sequence to push to production:

### 1. Merge Code to Main
```bash
git checkout main
git merge dev
git push origin main
```

### 2. Update Production Database
Push the finalized schema changes to the live production database.
```bash
npm run db:push:production
```

### 3. Deploy to Production Cloud Run
Trigger the build and deployment for the ops360-erp production service using the newly merged main branch.

### 4. Reset Workspace
Check out the dev branch again to prepare for the next feature build.

```bash
git checkout dev
```
