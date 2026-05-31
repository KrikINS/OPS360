import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://testuser:testpass@127.0.0.1:5432/ops360_test',
  },
  verbose: false,
  strict: false,
})
