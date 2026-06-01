import { describe, it } from 'vitest';
import { setupTestDb, seedBranch, seedProduct, seedInventoryUnits, seedCounter } from '@/test/db';
import { sql } from 'drizzle-orm';

describe('pos debug', () => {
  it('runs', async () => {
    const db = await setupTestDb();
    const branch = await seedBranch(db, { state: 'Maharashtra' });
    const product = await seedProduct(db, { branchId: branch.id, price: 1000 });
    await seedInventoryUnits(db, { productId: product.id, branchId: branch.id, count: 20 });
    await seedCounter(db, branch.id, 'INVOICE');

    const payload = {
      branch_id: branch.id,
      payment_mode: 'cash',
      customer_id: null,
      user_id: '00000000-0000-0000-0000-000000000001',
      items: [{
        product_id: product.id,
        qty: 2,
        unit_price: 1000,
      }],
    };

    try {
      const res = await db.execute(
        sql`SELECT process_pos_sale(${JSON.stringify(payload)}::jsonb)`
      );
      console.log("SUCCESS:", res);
    } catch (err: unknown) {
      console.error("ERROR CAUGHT!");
      console.dir(err, { depth: null });
      console.dir((err as NodeJS.ErrnoException).cause, { depth: null });
    }
  }, 30000); // 30s timeout
});
