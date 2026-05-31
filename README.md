This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# OPS360 Test Suite

Drop the files from this package into your project according to the path structure below.

## File mapping

```
vitest.config.ts                               → project root
src/test/vitest.setup.ts                       → global mocks (next-auth, next/cache, next/headers)
src/test/db.ts                                 → test DB helpers and seed functions
src/lib/__tests__/gst.test.ts                  → unit: GST calculation pure functions
src/lib/__tests__/landed-cost.test.ts          → unit: landed cost allocation
src/actions/__tests__/pos.test.ts              → integration: POS checkout Server Action
src/actions/__tests__/procurement.test.ts      → integration: PO + GRN Server Actions
src/actions/__tests__/inventory.test.ts        → integration: stock transfer + adjustment
```

## Install dependencies

```bash
npm install -D vitest @vitest/coverage-v8
# pg is likely already in your project; if not:
npm install -D pg @types/pg
```

## Create a test database

```bash
# Local development
createdb ops360_test

# Or add a Cloud SQL test instance and update .env.test
```

## Environment

Create `.env.test` in the project root:

```env
TEST_DATABASE_URL=postgresql://localhost:5432/ops360_test
```

Add to your `.gitignore`:
```
.env.test
```

## Running tests

```bash
# Unit tests only — fast, no DB needed
npm run test:unit

# Integration tests — needs TEST_DATABASE_URL
npm run test:integration

# All tests
npm run test:run

# Coverage report
npm run test:coverage

# Watch mode during development
npm run test:watch
```

## CI (cloudbuild.yaml)

Add before your Docker build step:

```yaml
- name: 'node:20'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      npm ci
      npm run test:unit
      # Integration tests require a test DB — set up a Cloud SQL instance
      # or use the same instance with a separate test database:
      npm run test:integration
  env:
    - 'TEST_DATABASE_URL=$$TEST_DATABASE_URL'
  secretEnv: ['TEST_DATABASE_URL']
```

## Adjusting to your schema

The test files assume the following import paths. Adjust if yours differ:

| Import | Expected location |
|---|---|
| `@/lib/gst` | GST calculation utilities |
| `@/lib/landed-cost` | Landed cost allocation utilities |
| `@/actions/pos` | POS Server Action |
| `@/actions/procurement` | Procurement Server Actions |
| `@/actions/inventory` | Inventory + transfer Server Actions |
| `@/db/schema` | Drizzle schema |

## What these tests cover

### Unit tests (~50ms total)
- GST rate calculations at all slabs (0%, 5%, 12%, 18%, 28%)
- CGST/SGST/IGST split — intra-state vs inter-state
- Multi-line invoice totals and penny reconciliation
- GSTIN format validation (all state codes)
- Landed cost proportional allocation — penny-exact across all line configs
- Rounding edge cases (floating point traps)

### Integration tests (~15–30s total)
- POS checkout: stock decrement, invoice number generation, GST calculation
- Concurrent invoice number uniqueness (15 parallel checkouts)
- PO creation with GST type selection (intra/inter-state)
- PO approval flow and role enforcement
- GRN receipt: stock increment, discrepancy reporting, landed cost application
- Stock transfers: full lifecycle, early-stage stock isolation, rejection
- Branch scoping: staff cannot access other branch inventory
- Stock adjustments: positive/negative, audit trail, role guards
- Serial number allocation and double-allocation prevention

