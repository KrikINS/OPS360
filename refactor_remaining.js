const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToFix = [
  'src/app/actions/branch.ts',
  'src/app/admin/customers/page.tsx',
  'src/app/admin/layout.tsx',
  'src/app/admin/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/api/admin/hsn-lookup/route.ts',
  'src/app/docs/layout.tsx',
  'src/app/launchpad/page.tsx',
  'src/app/login/page.tsx',
  'src/components/admin-sidebar.tsx',
  'src/components/admin/AddCustomerModal.tsx',
  'src/components/admin/CustomerHistoryDrawer.tsx',
  'src/components/admin/tabs/branding-tab.tsx',
  'src/components/admin/tabs/organization-tab.tsx',
  'src/components/app-sidebar.tsx',
  'src/components/pos/PosAddCustomerModal.tsx',
  'src/components/pos/ProductCatalog.tsx',
  'src/components/products/add-product-modal.tsx',
  'src/components/products/edit-product-modal.tsx',
  'src/components/sales/CustomerHistoryDrawer.tsx',
  'src/components/user-nav.tsx',
  'src/context/ServiceContext.tsx',
  'src/app/(dashboard)/transfer/components/StockRequestsView.tsx',
  'src/app/(dashboard)/transfer/components/StockTransfersView.tsx',
  'src/app/(dashboard)/vendors/client.tsx',
  'src/app/(dashboard)/vendors/page.tsx'
];

for (const relPath of filesToFix) {
  const file = path.join(__dirname, relPath.replace(/\//g, path.sep));
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Generic data fetching replacements
  content = content.replace(/await\s+supabase\s*\n?\s*\.from\('([^']+)'\)\s*\n?\s*\.select\('([^']+)'\)/g, 'await import("@/app/actions/generics").then(m => m.fetchData("$1"))');
  content = content.replace(/await\s+supabase\s*\n?\s*\.from\('([^']+)'\)\s*\n?\s*\.insert\(([^)]+)\)\s*\n?\s*\.select\(\)/g, 'await import("@/app/actions/generics").then(m => m.insertData("$1", $2))');
  content = content.replace(/await\s+supabase\s*\n?\s*\.from\('([^']+)'\)\s*\n?\s*\.update\(([^)]+)\)/g, 'await import("@/app/actions/generics").then(m => m.updateData("$1", $2))');
  content = content.replace(/await\s+supabase\s*\n?\s*\.from\('([^']+)'\)\s*\n?\s*\.delete\(\)/g, 'await import("@/app/actions/generics").then(m => m.deleteData("$1"))');
  
  // Specific auth replacements
  content = content.replace(/await\s+supabase\.auth\.getUser\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserAction())');
  content = content.replace(/await\s+supabase\.auth\.signOut\(\)/g, 'await import("@/app/actions/user").then(m => m.signOutAction())');
  content = content.replace(/supabase\.auth\.onAuthStateChange/g, '(() => ({ data: { subscription: { unsubscribe: () => {} } } }))');

  // RPC calls
  content = content.replace(/await\s+supabase\.rpc\('([^']+)'\s*(?:,\s*([^)]+))?\)/g, 'await import("@/app/actions/generics").then(m => m.rpcCall("$1", $2))');

  // Any raw supabase reference (fallback)
  content = content.replace(/(?<!\w)supabase(?!\w)/g, 'null');

  // Also remove leftover "const null = " after the last fallback
  content = content.replace(/const\s+null\s*=\s*[^;]+;/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Migrated ${file}`);
  }
}
