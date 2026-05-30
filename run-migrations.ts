import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './src/db/client';

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log("Migrations ran successfully!");
  } catch(e) {
    console.error("Migration failed", e);
  } finally {
    process.exit(0);
  }
}

main();
