const fs = require('fs');
let content = fs.readFileSync('src/actions/inventory.ts', 'utf8');

const regex = /  const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\r?\n  if \(role !== 'manager' && role !== 'admin' && role !== 'super_admin' && role !== 'admin\/owner'\) \{\r?\n    return \{ success: false as const, error: 'Insufficient permission: manager required' \}\r?\n  \}/g;

content = content.replace(regex, `  if (!(await hasCapability("inventory", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`);

fs.writeFileSync('src/actions/inventory.ts', content);
