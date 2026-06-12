import { db } from './src/db/client';
import { sql } from 'drizzle-orm';

async function run() {
  const r = await db.execute(sql`SELECT id, first_name, designation, status, branch_id FROM employees`);
  console.log(r.rows || r);
  process.exit(0);
}
run();
