const fs = require('fs');

function patchInventoryTs() {
  let content = fs.readFileSync('src/actions/inventory.ts', 'utf8');

  // FIX 1 — getInventorySummary (remove cross-branch block)
  // The current block is:
  //   const effectiveBranchId = await getEffectiveBranchId(session)
  //   if (effectiveBranchId && effectiveBranchId !== input.branchId) {
  //     const role = (session.user.role ?? '').toLowerCase()
  //     const isAdmin = role === 'admin' || role === 'super_admin' || role === 'admin/owner'
  //     if (!isAdmin) {
  //       return { success: false as const, error: 'Unauthorized: cannot access another branch' }
  //     }
  //   }
  const oldGetInvSummaryBlock = `  const effectiveBranchId = await getEffectiveBranchId(session)\n  if (effectiveBranchId && effectiveBranchId !== input.branchId) {\n    const role = (session.user.role ?? '').toLowerCase()\n    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'admin/owner'\n    if (!isAdmin) {\n      return { success: false as const, error: 'Unauthorized: cannot access another branch' }\n    }\n  }`;
  const newGetInvSummaryBlock = `  if (!(await hasCapability("inventory", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`;
  content = content.replace(oldGetInvSummaryBlock, newGetInvSummaryBlock);

  // FIX 2 — adjustStock
  const oldAdjustStockBlock = `  const role = (session.user.role ?? '').toLowerCase()\n  if (role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin/owner') {\n    return { success: false as const, error: 'Insufficient permission: manager required' }\n  }`;
  const newAdjustStockBlock = `  if (!(await hasCapability("inventory", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`;
  content = content.replace(oldAdjustStockBlock, newAdjustStockBlock);

  // For adjustStock, we also need to add the branch fence after `const { adjustmentQty, productId, branchId } = input`
  const adjStockFenceStr = `  const { adjustmentQty, productId, branchId } = input\n\n  const adjAllowed = await branchFilterFor(session, "inventory", "edit")\n  if (adjAllowed !== null && !adjAllowed.includes(branchId)) {\n    return { success: false as const, error: "You don't have access to this branch" }\n  }`;
  content = content.replace(`  const { adjustmentQty, productId, branchId } = input`, adjStockFenceStr);

  // FIX 3 — updateMinStockLevel
  const oldUpdateMinStockLevelBlock = `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }`;
  const newUpdateMinStockLevelBlock = `  if (!(await hasCapability("inventory", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`;
  content = content.replace(oldUpdateMinStockLevelBlock, newUpdateMinStockLevelBlock);

  // FIX 4 — assignVendorToProduct
  const oldAssignVendorBlock = `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }`;
  const newAssignVendorBlock = `  if (!(await hasCapability("inventory", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`;
  content = content.replace(oldAssignVendorBlock, newAssignVendorBlock);

  // FIX 5 — getInventoryRegistryAction (add view guard)
  const oldRegistryBlock = `  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized' }\n  }`;
  const newRegistryBlock = `  const session = await getServerSession(authOptions)\n  if (!session?.user) {\n    return { success: false as const, error: 'Unauthorized' }\n  }\n\n  if (!(await hasCapability("inventory", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`;
  content = content.replace(oldRegistryBlock, newRegistryBlock);

  fs.writeFileSync('src/actions/inventory.ts', content);
}

function patchAppInventoryTs() {
  let content = fs.readFileSync('src/app/actions/inventory.ts', 'utf8');

  // Add inventory view guard to fetchInventoryDataAction, getLowStockCountAction, searchProductsAction
  
  // fetchInventoryDataAction
  if (!content.includes('await hasCapability("inventory", "view", session)')) {
    // Note: getInventoryForExportAction might already have it, but we need to add to the others.
  }
  
  const oldFetch = `export async function fetchInventoryDataAction(userId: string, branchId?: string) {\n  try {`;
  const newFetch = `export async function fetchInventoryDataAction(userId: string, branchId?: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability("inventory", "view", session))) return { data: [], branches: [], canExport: false, error: 'Insufficient permission' }\n  try {`;
  content = content.replace(oldFetch, newFetch);

  const oldLowStockCount = `export async function getLowStockCountAction() {\n  try {`;
  const newLowStockCount = `export async function getLowStockCountAction() {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability("inventory", "view", session))) return { data: 0 }\n  try {`;
  content = content.replace(oldLowStockCount, newLowStockCount);

  const oldSearch = `export async function searchProductsAction(searchTerm: string) {\n  try {`;
  const newSearch = `export async function searchProductsAction(searchTerm: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user || !(await hasCapability("inventory", "view", session))) return { error: { message: 'Insufficient permission' } }\n  try {`;
  content = content.replace(oldSearch, newSearch);

  fs.writeFileSync('src/app/actions/inventory.ts', content);
}

patchInventoryTs();
patchAppInventoryTs();
console.log('done');
