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
 *   0008  Dynamic per-branch Cash in Hand accounts (1010-XX)
 *   0009  Added 2050 Loyalty Points Liability; loyalty redemption is a liability settlement
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from './client'
import { accounts, branches } from './schema'

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
  { code: '2050', name: 'Loyalty Points Liability',   type: 'Liability', is_system: true, is_active: true, description: 'Outstanding loyalty points owed to customers' },
  { code: '2060', name: 'TDS Payable',                type: 'Liability', is_system: true, is_active: true },
  // ── Equity ─────────────────────────────────────────────────────────
  { code: '3000', name: 'Owner Capital',               type: 'Equity',  is_system: true,  is_active: true  },
  { code: '3010', name: 'Retained Earnings',           type: 'Equity',  is_system: true,  is_active: true  },
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

  // ── Step 1: Seed the static COA ──────────────────
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

  console.log(`\n✅  Static Chart of Accounts seeded — ${COA.length} accounts processed.`)

  // ── Step 2: Dynamic per-branch Cash in Hand accounts ─
  console.log('\n🏪  Generating per-branch Cash in Hand accounts …')

  const allBranches = await db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)

  if (allBranches.length === 0) {
    console.log('  ⚠  No branches found — skipping dynamic cash accounts.')
  } else {
    let dynamicCount = 0

    for (let i = 0; i < allBranches.length; i++) {
      const branch = allBranches[i]
      // Use branch.code if available, otherwise use a zero-padded index
      const suffix = branch.code?.trim() || String(i + 1).padStart(2, '0')
      const accountCode = `1010-${suffix}`
      const accountName = `Cash in Hand (${branch.name})`

      await db
        .insert(accounts)
        .values({
          code:      accountCode,
          name:      accountName,
          type:      'Asset',
          branch_id: branch.id,
          is_system: true,
          is_active: true,
        })
        .onConflictDoUpdate({
          target: accounts.code,
          set: {
            name:      accountName,
            branch_id: branch.id,
            is_active: true,
          },
        })

      console.log(`  ✓  ${accountCode}  ${accountName}`)
      dynamicCount++
    }

    console.log(`\n✅  Dynamic cash accounts seeded — ${dynamicCount} branch accounts processed.`)
  }

  process.exit(0)
}

seedCoa().catch((err) => {
  console.error('❌  COA seed failed:', err)
  process.exit(1)
})
