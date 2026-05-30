import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:AppTerra360@localhost/postgres?host=/cloudsql/ops360-production-491911:asia-south1:ops360-db'
});

console.log(pool.options.host);
console.log(pool.options.port);
console.log(pool.options.database);
