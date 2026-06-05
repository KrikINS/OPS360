# Database Migrations Guide

## Production Database Migrations

**Note:** `drizzle-kit migrate` may time out or drop connections when running over the Cloud SQL proxy. Apply migration SQL files directly via `psql` instead.

### 1. Start Cloud SQL Proxy

```powershell
.\cloud-sql-proxy.exe ops360-production-491911:asia-south1:ops360-db --port=5433
```

### 2. Apply Schema Migrations

Find the latest generated SQL migration file in `src/db/migrations/` and apply it:

```powershell
$env:PGPASSWORD="AppTerra360"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -h 127.0.0.1 -p 5433 -U postgres -d ops360_production `
  -f src/db/migrations/000X_migration_name.sql
```

### 3. Apply Stored Procedures

If you modified custom stored procedures (e.g., POS transactions, custom functions), apply them:

```powershell
$env:PGPASSWORD="AppTerra360"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -h 127.0.0.1 -p 5433 -U postgres -d ops360_production `
  -f src/test/procedures.sql
```
