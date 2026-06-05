# OPS360 Database Migration Guide

## Workflow for schema changes

### 1. Make schema changes
Edit src/db/schema.ts with your changes.

### 2. Generate migration
  npx drizzle-kit generate --name=describe_your_change

This creates a new .sql file in src/db/migrations/

### 3. Test locally
  $env:DATABASE_URL="postgresql://testuser:testpass@127.0.0.1:5432/ops360_test"
  npx drizzle-kit migrate

### 4. Apply to staging
Start Cloud SQL proxy, then:
  npm run db:migrate:staging

### 5. Verify staging
Check the app works correctly on staging.

### 6. Apply to production (after staging confirmed)
  npm run db:migrate:production

## NEVER use drizzle-kit push on staging or production
push is for local test databases only. It can drop
columns and destroy data.

## Custom SQL (stored procedures, functions, views)
Apply these separately via psql:
  psql -f src/test/procedures.sql

These are NOT managed by Drizzle migrations.

## Current migration history
| File | Description |
|------|-------------|
| 0000 | Initial baseline |
| 0001 | Core schema (branches, products, inventory) |
| 0002 | GRN, attendance, service jobs |
| 0003 | Finance module (accounts, journals, expenses) |
| 0004 | Customer enhancements, loyalty, pricing fields |
