import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.staging' });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function createUser() {
  const email = 'anees.ahad1007@gmail.com';
  const newPassword = 'AppTerra2026!';
  
  try {
    const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, email));
    
    if (existingUsers.length > 0) {
      console.log(`User already exists! Resetting password...`);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(schema.users).set({ password_hash: hashedPassword }).where(eq(schema.users.email, email));
      console.log(`Password reset to: ${newPassword}`);
      return;
    }

    console.log(`Creating new user...`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Insert into users table
    const [newUser] = await db.insert(schema.users).values({
      email,
      password_hash: hashedPassword,
      role: 'admin'
    }).returning();

    // Insert into profiles table
    await db.insert(schema.profiles).values({
      id: newUser.id,
      full_name: 'Anees Ahad',
      role: 'admin',
      email: email
    });

    // Insert permissions
    const modules = ["admin", "inventory", "sales"];
    for (const mod of modules) {
      await db.insert(schema.user_permissions).values({
        user_id: newUser.id,
        module: mod,
        enabled: true
      });
    }

    console.log(`✅ User ${email} created successfully in staging with password: ${newPassword}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createUser();
