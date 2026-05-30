import { db } from './src/db/client';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("Applying schema...");
  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migrations', '0001_military_energizer.sql'), 'utf8');
    
    // Split by statement-breakpoint
    const statements = sqlContent.split('--> statement-breakpoint');
    
    for (const stmt of statements) {
      const cleanStmt = stmt.trim();
      if (!cleanStmt) continue;
      
      // Attempt to execute the statement
      try {
        await db.execute(cleanStmt);
        console.log("Successfully executed:", cleanStmt.substring(0, 50) + "...");
      } catch (err: unknown) {
        // If it's just "already exists" or "multiple primary keys", ignore
        if ((err as Error).message?.includes('already exists') || (err as Error).message?.includes('multiple primary keys for table')) {
          console.log("Skipped (already exists):", cleanStmt.substring(0, 50) + "...");
        } else {
          console.error("Error executing:", cleanStmt.substring(0, 50) + "...");
          console.error((err as Error).message);
        }
      }
    }
    console.log("Schema applied successfully!");
  } catch(e) {
    console.error("Failed", e);
  } finally {
    process.exit(0);
  }
}

main();
