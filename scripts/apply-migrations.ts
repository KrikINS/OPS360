import { config } from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';

const envFile = process.argv[2] === 'staging' ? '.env.staging' : '.env.local';
const envPath = `./${envFile}`;

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config(); // fallback
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function migrate() {
  console.log(`Applying to ${envFile}...`);
  try {
    await pool.query(`ALTER TABLE "grn_items" ALTER COLUMN "inventory_ids" SET DEFAULT '{}'::text[];`);
    console.log('Applied grn_items update.');
  } catch (e: any) {
    console.log('grn_items update skipped/failed:', e.message);
  }
  
  try {
    await pool.query(`ALTER TABLE "products" ADD COLUMN "margin_pct" numeric(5, 2) DEFAULT '5';`);
    console.log('Applied products update.');
  } catch (e: any) {
    console.log('products update skipped/failed:', e.message);
  }
  
  console.log('Done.');
  await pool.end();
}

migrate().catch(console.error);
