import { db } from './src/db/client';
import { products } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const res = await db.execute(sql`
    SELECT model_name, base_price, mrp,
      dealer_price, min_sell_price
    FROM products
    WHERE min_sell_price::numeric > mrp::numeric;
  `);
  console.log("RESULTS:", res);
  
  // Show SQL before executing
  console.log("FIX SQL:", `
    UPDATE products
    SET min_sell_price = mrp
    WHERE min_sell_price::numeric > mrp::numeric;
  `);
  
  await db.execute(sql`
    UPDATE products
    SET min_sell_price = mrp
    WHERE min_sell_price::numeric > mrp::numeric;
  `);
  console.log("FIX APPLIED");
  process.exit(0);
}

main().catch(console.error);
