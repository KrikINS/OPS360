import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.development' })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set in .env.development')

  console.log(`Connecting to ${url}...`)
  
  const client = new Client({
    connectionString: url,
    ssl: false
  })

  await client.connect()

  const query = `
    SELECT n.nspname AS schema_name, p.proname AS function_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schema_name, function_name;
  `
  
  try {
    const res = await client.query(query)
    console.log("Functions found:")
    for (const row of res.rows) {
      console.log(`${row.schema_name}.${row.function_name}`)
    }
  } finally {
    await client.end()
  }
}

main().catch(console.error)
