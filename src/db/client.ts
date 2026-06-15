import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
const connectionString =
  process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});


export const db = drizzle(pool, { schema });
