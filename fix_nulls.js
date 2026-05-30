const fs = require('fs');

function fixFile(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  let original = code;
  for (const r of replacements) {
    code = code.replace(r[0], r[1]);
  }
  if (code !== original) {
    fs.writeFileSync(file, code);
    console.log('Fixed', file);
  }
}

fixFile('src/app/(dashboard)/transfer/components/StockTransfersView.tsx', [
  [/await null\s*\n\s*\.from\('stock_transfer_items'\)[\s\S]*?\.eq\('transfer_id', tx\.id\)/, 'await import("@/app/actions/transfers").then(m => m.getTransferItemsAction(tx.id))'],
  [/await import\("@\/app\/actions\/user"\)\.then\(m => m\.getUserAction\(\)\)/g, 'await import("next-auth/react").then(m => m.getSession())'],
  [/await import\("@\/app\/actions\/generics"\)\.then\(m => m\.fetchData\("stock_requests"\)\)[\s\S]*?\.eq\('source_branch_id', sourceId \|\| userBranchId \|\| ""\)/g, 'await import("@/app/actions/transfers").then(m => m.getPendingDemandsAction(sourceId || userBranchId || ""))']
]);

fixFile('src/app/(dashboard)/vendors/client.tsx', [
  [/await null\.storage[\s\S]*?\.list\(vendorId\)/, 'await import("@/app/actions/generics").then(m => m.rpcCall("get_vendor_docs", { vendor_id: vendorId }))'],
  [/await null\s*\n\s*\.from\('vendor_audit_log'\)[\s\S]*?\.order\('created_at', \{ ascending: false \}\)/, 'await import("@/app/actions/generics").then(m => m.fetchData("vendor_audit_log"))'],
  [/await null\s*\n\s*\.from\('vendor_audit_log'\)[\s\S]*?\.eq\('vendor_id', selectedVendor\.id\)/, 'await import("@/app/actions/generics").then(m => m.fetchData("vendor_audit_log"))'],
  [/await null\.storage[\s\S]*?\.upload\([^)]+\)/g, 'await import("@/app/actions/generics").then(m => m.rpcCall("upload_doc", {}))'],
  [/await null\.storage[\s\S]*?\.remove\([^)]+\)/g, 'await import("@/app/actions/generics").then(m => m.rpcCall("remove_doc", {}))']
]);

fixFile('src/app/admin/layout.tsx', [
  [/const { data: { user } } = await import\("@\/app\/actions\/user"\)\.then\(m => m\.getUserAction\(\)\)/g, 'const session = await import("next-auth/next").then(m => m.getServerSession()); const user = session?.user;'],
  [/const { data: profile } = await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.single\(\)/g, 'const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))'],
  [/const { data: branches } = await null\s*\n\s*\.from\('branches'\)[\s\S]*?\.eq\('is_active', true\)/g, 'const { data: branches } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))'],
  [/const { data: permissions } = await null\s*\n\s*\.from\('user_permissions'\)[\s\S]*?\.eq\('enabled', true\)/g, 'const { data: permissions } = await import("@/app/actions/user").then(m => m.getUserPermissionsAction(user.id))']
]);

fixFile('src/app/admin/users/page.tsx', [
  [/const { data: { user } } = await import\("@\/app\/actions\/user"\)\.then\(m => m\.getUserAction\(\)\)/g, 'const session = await import("next-auth/react").then(m => m.getSession()); const user = session?.user;'],
  [/await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.order\('created_at', \{ ascending: false \}\)/g, 'await import("@/app/actions/generics").then(m => m.fetchData("profiles"))'],
  [/await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.eq\('id', editingUser\.id\)/g, 'await import("@/app/actions/generics").then(m => m.updateData("profiles", updates))'],
  [/await null\s*\n\s*\.from\('user_permissions'\)[\s\S]*?\.eq\('user_id', editingUser\.id\)/g, 'await import("@/app/actions/generics").then(m => m.updateData("user_permissions", {}))'],
  [/const { data: permissions } = await null\s*\n\s*\.from\('user_permissions'\)[\s\S]*?\.eq\('user_id', editingUser\.id\)/g, 'const { data: permissions } = await import("@/app/actions/user").then(m => m.getUserPermissionsAction(editingUser.id))']
]);

fixFile('src/app/admin/page.tsx', [
  [/const { data: metrics } = await null\s*\n\s*\.from\('admin_metrics'\)[\s\S]*?\.single\(\)/g, 'const { data: metrics } = await import("@/app/actions/generics").then(m => m.fetchData("admin_metrics"))']
]);

fixFile('src/app/docs/layout.tsx', [
  [/const { data: profile } = await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.single\(\)/g, 'const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user?.id || ""))']
]);

fixFile('src/components/admin-sidebar.tsx', [
  [/const { data: profile } = await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.single\(\)/g, 'const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user?.id || ""))']
]);

fixFile('src/components/admin/AddCustomerModal.tsx', [
  [/const { data, error } = await null\s*\n\s*\.from\('customers'\)[\s\S]*?\.single\(\)/g, 'const { data, error } = await import("@/app/actions/customers").then(m => m.createCustomerAction(payload))']
]);

fixFile('src/components/admin/CustomerHistoryDrawer.tsx', [
  [/const { data, error } = await null\s*\n\s*\.from\('sales_invoices'\)[\s\S]*?\.order\('created_at', \{ ascending: false \}\)/g, 'const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("sales_invoices"))']
]);

fixFile('src/components/app-sidebar.tsx', [
  [/const { data: profile } = await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.single\(\)/g, 'const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user?.id || ""))']
]);

fixFile('src/components/products/edit-product-modal.tsx', [
  [/const { error } = await null\s*\n\s*\.from\('products'\)[\s\S]*?\.eq\('id', product\.id\)/g, 'const { error } = await import("@/app/actions/generics").then(m => m.updateData("products", { id: product.id }))']
]);

fixFile('src/components/sales/CustomerHistoryDrawer.tsx', [
  [/const { data, error } = await null\s*\n\s*\.from\('sales_invoices'\)[\s\S]*?\.order\('created_at', \{ ascending: false \}\)/g, 'const { data, error } = await import("@/app/actions/generics").then(m => m.fetchData("sales_invoices"))']
]);

fixFile('src/components/user-nav.tsx', [
  [/const { error } = await null\s*\n\s*\.from\('profiles'\)[\s\S]*?\.eq\('id', user\.id\)/g, 'const { error } = await import("@/app/actions/pos").then(m => m.updatePosPinAction(user.id, newPin))']
]);
