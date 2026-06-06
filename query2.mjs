import dotenv from 'dotenv';
dotenv.config({path: '.env.staging'});
import pg from 'pg';
const { Client } = pg;
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect()
 .then(() => c.query("SELECT * FROM sales_invoices ORDER BY created_at DESC LIMIT 3;"))
 .then(r => { console.log("INVOICES:"); console.log(r.rows); })
 .then(() => c.query("SELECT * FROM invoice_items ORDER BY created_at DESC LIMIT 5;"))
 .then(r => { console.log("ITEMS:"); console.log(r.rows); })
 .catch(console.error)
 .finally(() => c.end());
