import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:AppTerra360@34.180.59.139:5432/postgres',
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('select "id", "email", "password_hash", "role", "created_at" from "users" where "users"."email" = $1', ['admin@ethanhome.com']);
    console.log("Query result:", res.rows);
  } catch (err) {
    console.error("Database Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
