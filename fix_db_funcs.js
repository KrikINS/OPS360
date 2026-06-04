require('dotenv').config({path: '.env.development.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const queries = `
CREATE OR REPLACE FUNCTION search_customer_by_phone(p_phone text)
RETURNS SETOF customers
LANGUAGE sql
AS $$
  SELECT * FROM customers WHERE phone_number LIKE '%' || p_phone || '%' ORDER BY created_at DESC LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION search_pos_customers(p_term text)
RETURNS SETOF customers
LANGUAGE sql
AS $$
  SELECT * FROM customers WHERE full_name ILIKE '%' || p_term || '%' OR phone_number LIKE '%' || p_term || '%' ORDER BY created_at DESC LIMIT 10;
$$;

CREATE OR REPLACE VIEW view_invoice_details AS
SELECT 
  ii.*,
  p.model_name,
  p.brand,
  p.product_code
FROM invoice_items ii
JOIN products p ON ii.product_id = p.id;
`;

pool.query(queries).then(() => {
  console.log('Functions and views created successfully.');
  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});
