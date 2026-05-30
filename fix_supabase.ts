import * as fs from 'fs';
import * as path from 'path';

function stripSupabase(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+["']@\/utils\/supabase\/(client|server)["'];?/g, '');
    content = content.replace(/import\s+{\s*supabase\s*}\s+from\s+["']@\/lib\/supabase["'];?/g, '');
    content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+["']@supabase\/ssr["'];?/g, '');
    content = content.replace(/import\s+{\s*supabaseAdmin\s*}\s+from\s+["']@\/lib\/supabaseAdmin["'];?/g, '');
    
    // Remove client init
    content = content.replace(/const\s+supabase\s*=\s*await\s+createClient\(\);?/g, '');
    content = content.replace(/const\s+supabase\s*=\s*createClient\(\);?/g, '');
    
    // For API routes using supabase admin
    content = content.replace(/const\s+supabase\s*=\s*supabaseAdmin;?/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
  'src/app/admin/layout.tsx',
  'src/app/api/admin/hsn-lookup/route.ts',
  'src/app/api/admin/logo/route.ts',
  'src/app/api/admin/reset-password/route.ts',
  'src/app/api/admin/staff/route.ts',
  'src/app/api/branches/route.ts',
  'src/app/api/inventory/import/route.ts',
  'src/app/api/procurement/returns/route.ts',
  'src/app/api/procurement/upload/route.ts',
  'src/app/docs/layout.tsx',
  'src/components/admin-sidebar.tsx',
  'src/components/admin/AddCustomerModal.tsx',
  'src/components/admin/CustomerHistoryDrawer.tsx',
  'src/components/admin/tabs/branding-tab.tsx',
  'src/components/admin/tabs/global-masters-tab.tsx',
  'src/components/app-sidebar.tsx',
  'src/components/pos/PosAddCustomerModal.tsx',
  'src/components/pos/ProductCatalog.tsx',
  'src/components/products/BulkImportModal.tsx',
  'src/components/products/edit-product-modal.tsx',
  'src/components/sales/CustomerHistoryDrawer.tsx',
  'src/components/user-nav.tsx',
  'src/context/PosContext.tsx',
  'src/context/ServiceContext.tsx'
];

files.forEach(stripSupabase);
console.log("Stripped imports");
