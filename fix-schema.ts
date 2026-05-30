import { db } from "./src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID;`);
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();`);
    
    // Also user_branch_access
    await db.execute(sql`CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      code TEXT,
      created_at TIMESTAMP DEFAULT now()
    );`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS user_branch_access (
      user_id UUID NOT NULL,
      branch_id UUID NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      PRIMARY KEY (user_id, branch_id)
    );`);
    
    // user_permissions
    await db.execute(sql`CREATE TABLE IF NOT EXISTS user_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      module TEXT NOT NULL,
      enabled BOOLEAN DEFAULT false
    );`);
    
    console.log("Database updated successfully.");
  } catch (error) {
    console.error("Error updating database:", error);
  }
  process.exit(0);
}

main();
