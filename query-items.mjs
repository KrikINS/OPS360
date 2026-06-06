import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.staging') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query('SELECT * FROM invoice_items ORDER BY id DESC LIMIT 5;');
    console.log(JSON.stringify(res.rows, null, 2));

    const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='invoice_items';`);
    console.log("COLUMNS:");
    console.log(JSON.stringify(cols.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
