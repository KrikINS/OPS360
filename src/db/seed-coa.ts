/**
 * seed-coa.ts  —  Seeds / repairs the Chart of Accounts.
 *
 * Run with:  npx tsx src/db/seed-coa.ts
 *
 * Idempotent: uses ON CONFLICT (code) DO UPDATE so it is safe to run
 * multiple times. Existing rows are updated to the canonical values.
 *
 * Change history:
 *   0001  Initial COA (1010, 1020, 1040, 1050, 2010, 2020-2040, 4000, 5010-5070)
 *   0006  Split 1050 → 1051/1052/1053; added 5080 Loyalty Discount Expense
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from './client'
import { accounts } from './schema'
import { sql } from 'drizzle-orm'

const COA = [
  // ── Assets ──────────────────────────────────────────────────────────
  { code: '1010', name: 'Cash & Petty Cash',          type: 'Asset',   is_system: true,  is_active: true  },
  { code: '1020', name: 'Bank Accounts',               type: 'Asset',   is_system: true,  is_active: true  },
  { code: '1040', name: 'Inventory Asset',             type: 'Asset',   is_system: true,  is_active: true  },
  // ── Tax — Input (ITC) ────────────────────────────────────────────────
  // 1050 is deliberately kept but marked inactive; existing journal_lines
  // referencing it remain auditable. New postings use 1051/1052/1053.
  { code: '1050', name: 'GST ITC (legacy — inactive)', type: 'Tax',     is_system: true,  is_active: false },
  { code: '1051', name: 'CGST Input Tax Credit',       type: 'Tax',     is_system: true,  is_active: true  },
  { code: '1052', name: 'SGST Input Tax Credit',       type: 'Tax',     is_system: true,  is_active: true  },
  { code: '1053', name: 'IGST Input Tax Credit',       type: 'Tax',     is_system: true,  is_active: true  },
  // ── Liabilities ──────────────────────────────────────────────────────
  { code: '2010', name: 'Accounts Payable',            type: 'Liability', is_system: true, is_active: true },
  // ── Tax — Output (Payable) ───────────────────────────────────────────
  { code: '2020', name: 'GST Payable (CGST)',          type: 'Tax',     is_system: true,  is_active: true  },
  { code: '2030', name: 'GST Payable (SGST)',          type: 'Tax',     is_system: true,  is_active: true  },
  { code: '2040', name: 'GST Payable (IGST)',          type: 'Tax',     is_system: true,  is_active: true  },
  // ── Revenue ──────────────────────────────────────────────────────────
  { code: '4000', name: 'Sales Revenue',               type: 'Revenue', is_system: true,  is_active: true  },
  // ── Expenses ─────────────────────────────────────────────────────────
  { code: '5010', name: 'Cost of Goods Sold',          type: 'Expense', is_system: true,  is_active: true  },
  { code: '5020', name: 'Freight & Logistics',         type: 'Expense', is_system: true,  is_active: true  },
  { code: '5030', name: 'Utilities',                   type: 'Expense', is_system: true,  is_active: true  },
  { code: '5040', name: 'Rent',                        type: 'Expense', is_system: true,  is_active: true  },
  { code: '5050', name: 'Salaries & Wages',            type: 'Expense', is_system: true,  is_active: true  },
  { code: '5060', name: 'Marketing & Advertising',     type: 'Expense', is_system: true,  is_active: true  },
  { code: '5070', name: 'Miscellaneous Expense',       type: 'Expense', is_system: true,  is_active: true  },
  { code: '5080', name: 'Loyalty Discount Expense',    type: 'Expense', is_system: true,  is_active: true  },
]

async function seedCoa() {
  console.log('🏦  Seeding Chart of Accounts …')

  for (const account of COA) {
    await db
      .insert(accounts)
      .values(account)
      .onConflictDoUpdate({
        target: accounts.code,
        set: {
          name:      account.name,
          type:      account.type,
          is_system: account.is_system,
          is_active: account.is_active,
        },
      })
    console.log(`  ✓  ${account.code}  ${account.name}`)
  }

  console.log(`\n✅  Chart of Accounts seeded — ${COA.length} accounts processed.`)
  process.exit(0)
}

seedCoa().catch((err) => {
  console.error('❌  COA seed failed:', err)
  process.exit(1)
})
