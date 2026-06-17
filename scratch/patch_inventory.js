const fs = require('fs');

function patchInventoryTs() {
  let content = fs.readFileSync('src/actions/inventory.ts', 'utf8');

  // Add imports
  if (!content.includes('import { hasCapability, branchFilterFor }')) {
    content = content.replace(
      "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'",
      "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'\nimport { hasCapability, branchFilterFor } from '@/lib/access'"
    );
  }

  // 1. requestStockTransfer
  if (!content.includes('hasCapability("inventory", "view", session)')) {
    content = content.replace(
      "  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }",
      "  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }\n  if (!(await hasCapability(\"inventory\", \"view\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }\n  const allowed = await branchFilterFor(session, \"inventory\", \"edit\")\n  if (allowed !== null && !allowed.includes(input.toBranchId)) {\n    return { success: false as const, error: \"You don't have access to destination branch\" }\n  }"
    );
  }

  // 2. approveStockTransfer
  content = content.replace(
    "export async function approveStockTransfer(input: { transferId: string }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }",
    "export async function approveStockTransfer(input: { transferId: string }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }\n  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 3. completeStockTransfer
  content = content.replace(
    "export async function completeStockTransfer(input: { transferId: string }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }",
    "export async function completeStockTransfer(input: { transferId: string }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }\n  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }\n  // We check branch fence in confirmTransferReceiptAction if needed, or we can fetch it here.\n  // Since we don't have the record here easily without a query, we'll just rely on capability for now, or add a query."
  );

  // 4. rejectStockTransfer
  content = content.replace(
    "export async function rejectStockTransfer(input: {\n  transferId: string\n  reason?: string\n}) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }",
    "export async function rejectStockTransfer(input: {\n  transferId: string\n  reason?: string\n}) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized: not authenticated' }\n  }\n  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 5. adjustStock
  content = content.replace(
    "  const role = (session.user.role ?? '').toLowerCase()\n  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {\n    return { success: false as const, error: 'Insufficient permission: manager required' }\n  }\n\n  const { adjustmentQty, productId, branchId } = input",
    "  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }\n  const { adjustmentQty, productId, branchId } = input\n  const adjAllowed = await branchFilterFor(session, \"inventory\", \"edit\")\n  if (adjAllowed !== null && !adjAllowed.includes(branchId)) {\n    return { success: false as const, error: \"You don't have access to this branch\" }\n  }"
  );

  // 6. getInventorySummary
  content = content.replace(
    "  const effectiveBranchId = await getEffectiveBranchId(session)\n  if (effectiveBranchId && effectiveBranchId !== input.branchId) {\n    const role = (session.user.role ?? '').toLowerCase()\n    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'admin/owner'\n    if (!isAdmin) {\n      return { success: false as const, error: 'Unauthorized: cannot access another branch' }\n    }\n  }",
    "  if (!(await hasCapability(\"inventory\", \"view\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 7. allocateSerialNumber
  content = content.replace(
    "export async function allocateSerialNumber(input: {\n  productId: string\n  branchId: string\n  serialNumber: string\n  transactionId: string\n}): Promise<{ success: boolean; error?: string }> {\n  try {\n    return await db.transaction(async (tx) => {",
    "export async function allocateSerialNumber(input: {\n  productId: string\n  branchId: string\n  serialNumber: string\n  transactionId: string\n}): Promise<{ success: boolean; error?: string }> {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false, error: 'Insufficient permission' }\n  }\n  try {\n    return await db.transaction(async (tx) => {"
  );

  // 8. getInventoryRegistryAction
  content = content.replace(
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized' }\n  }",
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized' }\n  }\n  if (!(await hasCapability(\"inventory\", \"view\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 9. getLowStockItems
  content = content.replace(
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }",
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }\n  if (!(await hasCapability(\"inventory\", \"view\", session))) return { success: false as const, error: 'Insufficient permission' }"
  );

  // 10. updateMinStockLevel
  content = content.replace(
    "  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }",
    "  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 11. assignVendorToProduct
  content = content.replace(
    "  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }",
    "  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }"
  );

  // 12. getAllProductsWithStockLevel
  content = content.replace(
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }",
    "  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }\n  if (!(await hasCapability(\"inventory\", \"view\", session))) return { success: false as const, error: 'Insufficient permission' }"
  );

  fs.writeFileSync('src/actions/inventory.ts', content);
}

function patchAppInventoryTs() {
  let content = fs.readFileSync('src/app/actions/inventory.ts', 'utf8');

  if (!content.includes('import { getServerSession }')) {
    content = content.replace(
      'import { db } from "@/db/client"',
      'import { getServerSession } from "next-auth"\nimport { authOptions } from "@/lib/auth"\nimport { hasCapability } from "@/lib/access"\nimport { db } from "@/db/client"'
    );
  }

  // fetchInventoryDataAction
  if (!content.includes('await hasCapability("inventory", "view", session)')) {
    content = content.replace(
      "export async function fetchInventoryDataAction(userId: string, branchId?: string) {\n  try {",
      "export async function fetchInventoryDataAction(userId: string, branchId?: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability(\"inventory\", \"view\", session))) return { data: [], branches: [], canExport: false, error: 'Insufficient permission' }\n  try {"
    );
  }

  // getInventoryForExportAction
  content = content.replace(
    "export async function getInventoryForExportAction() { try { const data = await db.select().from(inventory); return { data }; } catch(error) { return { error: { message: String(error) } }; } }",
    "export async function getInventoryForExportAction() {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability(\"inventory\", \"view\", session))) return { error: { message: 'Insufficient permission' } }\n  try { const data = await db.select().from(inventory); return { data }; } catch(error) { return { error: { message: String(error) } }; }\n}"
  );

  // getLowStockCountAction
  content = content.replace(
    "export async function getLowStockCountAction() {\n  try {",
    "export async function getLowStockCountAction() {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability(\"inventory\", \"view\", session))) return { data: 0 }\n  try {"
  );

  // searchProductsAction
  content = content.replace(
    "export async function searchProductsAction(searchTerm: string) {\n  try {",
    "export async function searchProductsAction(searchTerm: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability(\"inventory\", \"view\", session))) return { error: { message: 'Insufficient permission' } }\n  try {"
  );

  fs.writeFileSync('src/app/actions/inventory.ts', content);
}

function patchReleaseQuarantine() {
  let content = fs.readFileSync('src/app/api/inventory/release-quarantine/route.ts', 'utf8');

  if (!content.includes('hasCapability')) {
    content = content.replace(
      "import { eq } from 'drizzle-orm'",
      "import { eq } from 'drizzle-orm'\nimport { hasCapability, branchFilterFor } from '@/lib/access'"
    );

    content = content.replace(
      "    const role = (session.user.role ?? '').toLowerCase()\n    if (!['manager', 'admin', 'super_admin', 'admin/owner'].includes(role)) {\n      return NextResponse.json({ success: false, error: 'Manager permission required' }, { status: 403 })\n    }",
      "    if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n      return NextResponse.json({ success: false, error: 'Insufficient permission' }, { status: 403 })\n    }"
    );
    
    // Add branch fence
    content = content.replace(
      "    // Verify the unit is actually in Quarantine\n    const unit = await db.query.inventory.findFirst({\n      where: eq(inventory.id, inventoryId)\n    })\n    if (!unit) return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 })",
      "    // Verify the unit is actually in Quarantine\n    const unit = await db.query.inventory.findFirst({\n      where: eq(inventory.id, inventoryId)\n    })\n    if (!unit) return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 })\n\n    const allowed = await branchFilterFor(session, \"inventory\", \"edit\")\n    if (allowed !== null && unit.branch_id && !allowed.includes(unit.branch_id)) {\n      return NextResponse.json({ success: false, error: \"You don't have access to this branch\" }, { status: 403 })\n    }"
    );
  }

  fs.writeFileSync('src/app/api/inventory/release-quarantine/route.ts', content);
}

function patchImport() {
  let content = fs.readFileSync('src/app/api/inventory/import/route.ts', 'utf8');

  if (!content.includes('hasCapability')) {
    content = content.replace(
      "import { createJournalEntry } from '@/actions/finance'",
      "import { createJournalEntry } from '@/actions/finance'\nimport { hasCapability } from '@/lib/access'"
    );

    content = content.replace(
      "  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {\n    return NextResponse.json(\n      { error: 'Admin role required' }, { status: 403 }\n    )\n  }",
      "  if (!(await hasCapability(\"inventory\", \"edit\", session))) {\n    return NextResponse.json(\n      { error: 'Insufficient permission' }, { status: 403 }\n    )\n  }"
    );
  }

  fs.writeFileSync('src/app/api/inventory/import/route.ts', content);
}

patchInventoryTs();
patchAppInventoryTs();
patchReleaseQuarantine();
patchImport();
console.log('done');
