const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name='profiles'"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(console.error);
