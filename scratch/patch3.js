const fs = require('fs');

function patch() {
  let content = fs.readFileSync('src/actions/inventory.ts', 'utf8');

  // getInventorySummary
  content = content.replace(/  const effectiveBranchId = await getEffectiveBranchId\(session\)\r?\n  if \(effectiveBranchId && effectiveBranchId !== input\.branchId\) \{\r?\n    const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\r?\n    const isAdmin = role === 'admin' \|\| role === 'super_admin' \|\| role === 'admin\/owner'\r?\n    if \(!isAdmin\) \{\r?\n      return \{ success: false as const, error: 'Unauthorized: cannot access another branch' \}\r?\n    \}\r?\n  \}/g, `  if (!(await hasCapability("inventory", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`);

  fs.writeFileSync('src/actions/inventory.ts', content);
}
patch();
