const fs = require('fs');

function patch() {
  let content = fs.readFileSync('src/actions/inventory.ts', 'utf8');

  // Fix updateMinStockLevel and assignVendorToProduct
  content = content.replace(/  const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\r?\n  if \(!\['admin', 'super_admin', 'admin\/owner', 'manager'\]\.includes\(role\)\) \{\r?\n    return \{ success: false as const, error: 'Manager role required' \}\r?\n  \}/g, `  if (!(await hasCapability("inventory", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`);

  // Fix getLowStockItems and getAllProductsWithStockLevel to have view guard.
  // getLowStockItems
  content = content.replace(
    /export async function getLowStockItems\(input\?: \{ branchId\?: string \| null \}\) \{\r?\n  const session = await getServerSession\(authOptions\)\r?\n  if \(!session\?\.user\) return \{ success: false as const, error: 'Unauthorized' \}/g,
    `export async function getLowStockItems(input?: { branchId?: string | null }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }\n  if (!(await hasCapability("inventory", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
  );

  // getAllProductsWithStockLevel
  content = content.replace(
    /export async function getAllProductsWithStockLevel\(input\?: \{ branchId\?: string \| null \}\) \{\r?\n  const session = await getServerSession\(authOptions\)\r?\n  if \(!session\?\.user\) return \{ success: false as const, error: 'Unauthorized' \}/g,
    `export async function getAllProductsWithStockLevel(input?: { branchId?: string | null }) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { success: false as const, error: 'Unauthorized' }\n  if (!(await hasCapability("inventory", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
  );

  fs.writeFileSync('src/actions/inventory.ts', content);
}
patch();
