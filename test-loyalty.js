const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/ops360_staging' // Assuming local, or maybe it's in .env
});

async function run() {
  require('dotenv').config({ path: '.env.local' });
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  console.log('--- CUSTOMERS ---');
  const res1 = await localPool.query(`
    SELECT id, full_name, customer_type, loyalty_balance
    FROM customers ORDER BY full_name;
  `);
  console.table(res1.rows);

  console.log('--- LOYALTY POINTS ---');
  const res2 = await localPool.query(`
    SELECT customer_id, type, points, balance_after, created_at
    FROM loyalty_points ORDER BY created_at DESC LIMIT 10;
  `);
  console.table(res2.rows);

  process.exit(0);
}

run().catch(console.error);
