import { db } from '@/db/client';
import { describe, it } from 'vitest';
import { sql } from 'drizzle-orm';

describe('loyalty debug', () => {
  it('runs query', async () => {
    const res = await db.execute(sql`SELECT jsonb_build_object('val', 10.50::numeric) as obj`);
    console.log('type:', typeof (res as any).rows[0].obj.val, 'val:', (res as any).rows[0].obj.val);
  });
});
