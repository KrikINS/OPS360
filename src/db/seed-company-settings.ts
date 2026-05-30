import { db } from "./client";
import { company_settings } from "./schema";

async function main() {
  console.log("Seeding company settings...");

  await db.insert(company_settings).values({
    company_name: 'Ethan Home Appliances',
    primary_color: '#002244'
  }).onConflictDoNothing();

  console.log("Company settings seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding company settings:", err);
  process.exit(1);
});
