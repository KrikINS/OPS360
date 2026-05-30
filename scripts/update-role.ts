import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const TARGET_EMAIL = 'admin@ethanhome.com';
const NEW_ROLE = 'Admin/Owner';

async function main() {
  const user = await db.select().from(schema.users).where(eq(schema.users.email, TARGET_EMAIL)).limit(1);
  if (!user.length) { console.error('User not found'); process.exit(1); }

  const userId = user[0].id;
  await db.update(schema.users).set({ role: NEW_ROLE }).where(eq(schema.users.id, userId));
  await db.update(schema.profiles).set({ role: NEW_ROLE }).where(eq(schema.profiles.id, userId));

  console.log(`Updated ${TARGET_EMAIL} → role: "${NEW_ROLE}" in both users and profiles tables.`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
