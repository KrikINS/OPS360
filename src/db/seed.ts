import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "./client";
import { users } from "./schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Starting database seed...");
    
    // Hash the secure password
    const plainPassword = "Ops360-Secure-Admin-2026!";
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    console.log("Password hashed. Inserting admin user...");

    // Insert user into Drizzle database
    const result = await db.insert(users).values({
      email: "admin@ethanhome.com",
      password_hash: passwordHash,
      role: "SUPER_ADMIN",
    }).returning();

    console.log("Master Admin account was created successfully!");
    console.log(result);
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
