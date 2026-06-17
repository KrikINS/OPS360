import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.staging' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const query = `
    SELECT
      u.id,
      u.email,
      u.role        AS users_role,
      p.role        AS profiles_role,
      CASE WHEN lower(coalesce(u.role,'')) = lower(coalesce(p.role,'')) THEN 'match' ELSE 'DIFFERS' END AS status
    FROM users u
    LEFT JOIN profiles p ON p.id = u.id
    ORDER BY status DESC, u.email;
  `;
  try {
    const { rows } = await pool.query(query);
    console.table(rows);
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
