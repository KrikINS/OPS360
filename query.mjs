import dotenv from 'dotenv';
dotenv.config({path: '.env.staging'});
import pg from 'pg';
const { Client } = pg;
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect().then(() => c.query("SELECT pg_get_functiondef('process_pos_sale'::regproc)")).then(r => console.log(r.rows[0].pg_get_functiondef)).catch(console.error).finally(() => c.end());
