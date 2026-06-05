const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:AppTerra360@34.180.59.139:5432/ops360_staging', connectionTimeoutMillis: 3000 });
c.connect().then(() => c.query("SELECT proname FROM pg_proc WHERE proname = 'process_pos_sale'")).then(r => console.log(r.rows)).catch(console.error).finally(() => c.end());
