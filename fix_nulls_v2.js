const fs = require('fs');

function fixFile(file, replacements) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;
    for (const r of replacements) {
      code = code.replace(r[0], r[1]);
    }
    if (code !== original) {
      fs.writeFileSync(file, code);
      console.log('Fixed', file);
    }
  } catch(e) {}
}

const uiReplacements = [
  [/await null\s*\n?\s*\.from\('profiles'\)\s*\n?\s*\.select\([\s\S]*?\)\s*\n?\s*\.eq\('id', user\?\.id\s*\|\|\s*""\)\s*\n?\s*\.single\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserProfileAction(user?.id || ""))'],
  [/await null\s*\n?\s*\.from\('profiles'\)\s*\n?\s*\.select\([\s\S]*?\)\s*\n?\s*\.eq\('id', user\.id\)\s*\n?\s*\.single\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))'],
  [/await null\s*\n?\s*\.from\('admin_metrics'\)\s*\n?\s*\.select\([\s\S]*?\)\s*\n?\s*\.single\(\)/g, 'await import("@/app/actions/generics").then(m => m.fetchData("admin_metrics"))'],
  [/await null\s*\n?\s*\.from\('customers'\)\s*\n?\s*\.insert\([\s\S]*?\)\s*\n?\s*\.select\(\)\s*\n?\s*\.single\(\)/g, 'await import("@/app/actions/customers").then(m => m.createCustomerAction(payload))'],
  [/await null\s*\n?\s*\.from\('products'\)\s*\n?\s*\.update\([\s\S]*?\)\s*\n?\s*\.eq\('id', product\.id\)/g, 'await import("@/app/actions/generics").then(m => m.updateData("products", { ...updates, id: product.id }))'],
  [/await null\s*\n?\s*\.from\('profiles'\)\s*\n?\s*\.update\([\s\S]*?\)\s*\n?\s*\.eq\('id', user\.id\)/g, 'await import("@/app/actions/pos").then(m => m.updatePosPinAction(user.id, newPin))'],
  [/await null\s*\n?\s*\.from\('hsn_sac_codes'\)\s*\n?\s*\.select\([\s\S]*?\)\s*\n?\s*\.ilike\('code', `%${query}%`\)\s*\n?\s*\.limit\(10\)/g, 'await import("@/app/actions/generics").then(m => m.fetchData("hsn_sac_codes"))']
];

fixFile('src/app/admin/page.tsx', uiReplacements);
fixFile('src/app/admin/users/page.tsx', uiReplacements);
fixFile('src/app/docs/layout.tsx', uiReplacements);
fixFile('src/components/admin-sidebar.tsx', uiReplacements);
fixFile('src/components/admin/AddCustomerModal.tsx', uiReplacements);
fixFile('src/components/app-sidebar.tsx', uiReplacements);
fixFile('src/components/products/edit-product-modal.tsx', uiReplacements);
fixFile('src/components/user-nav.tsx', uiReplacements);
fixFile('src/app/api/admin/hsn-lookup/route.ts', uiReplacements);

// Also fix admin layout type error
let adminLayout = fs.readFileSync('src/app/admin/layout.tsx', 'utf8');
adminLayout = adminLayout.replace(/let allBranches: \{ id: string; name: string; is_primary: boolean \}\[\] \| undefined = undefined/, 
  'let allBranches: { id: string; name: string; is_primary: boolean }[] | undefined = []');
fs.writeFileSync('src/app/admin/layout.tsx', adminLayout);
