require('dotenv').config({path: '.env.development.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT proname FROM pg_proc WHERE proname IN ('search_customer_by_phone', 'search_pos_customers', 'process_pos_sale', 'get_user_pos_stats');").then(res => {
  console.log('Functions:', res.rows);
  return pool.query("SELECT relname FROM pg_class WHERE relname = 'view_invoice_details';");
}).then(res => {
  console.log('Views:', res.rows);
  pool.end();
}).catch(console.error);
