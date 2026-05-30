const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles('src', []);

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove imports
  content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+["']@\/utils\/supabase\/client["'];?\n?/g, '');
  content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+["']@\/utils\/supabase\/server["'];?\n?/g, '');
  content = content.replace(/import\s+{\s*supabase\s*}\s+from\s+["']@\/lib\/supabase["'];?\n?/g, '');
  content = content.replace(/import\s+{\s*supabaseAdmin\s*}\s+from\s+["']@\/lib\/supabaseAdmin["'];?\n?/g, '');
  content = content.replace(/import\s+{\s*createClient\s*}\s+from\s+["']@supabase\/ssr["'];?\n?/g, '');

  // 2. Remove client initialization
  content = content.replace(/const\s+supabase\s*=\s*await\s+createClient\(\);?/g, '');
  content = content.replace(/const\s+supabase\s*=\s*createClient\(\);?/g, '');
  content = content.replace(/const\s+supabase\s*=\s*supabaseAdmin;?/g, '');
  content = content.replace(/const\s+supabase\s*=\s*{}\s*as\s+any;?/g, '');
  content = content.replace(/const\s+supabase\s*=\s*{};?/g, '');
  content = content.replace(/const\s+supabase\s*=\s*useMemo\(\(\)\s*=>\s*{}\s*as\s*unknown,\s*\[\]\);?/g, '');

  // 3. Remove supabase from useEffect dependencies
  content = content.replace(/,\s*supabase\]/g, ']');
  content = content.replace(/\[supabase,\s*/g, '[');
  content = content.replace(/\[supabase\]/g, '[]');

  // Specific file patches
  if (file.includes('PosContext.tsx')) {
    // We already mocked it with Promise.resolve earlier, let's replace those with actual Server Actions
    content = content.replace(/await\s+\(Promise\.resolve\({ data: { user: null } }\)\s+as\s+unknown\s+as\s+Promise<.*?>\)/g, 'await import("@/app/actions/user").then(m => m.getUserAction())');
    content = content.replace(/await\s+\(Promise\.resolve\({ data: \[\], error: null }\)\s+as\s+unknown\s+as\s+Promise<.*?>\)/g, 'await import("@/app/actions/pos").then(m => m.getUserPosStatsAction())');
    content = content.replace(/await\s+\(\{\}\s+as\s+unknown\s+as\s+any\)\.auth\.signOut\(\)/g, 'await import("@/app/actions/user").then(m => m.signOutAction())');
    content = content.replace(/await\s+\(\{\}\s+as\s+unknown\s+as\s+any\)\s*\n\s*\.from\('profiles'\)\s*\n\s*\.update\(\{ pos_pin: newPin \}\)\s*\n\s*\.eq\('id',\s*user\.id\)/g, 'await import("@/app/actions/pos").then(m => m.updatePosPinAction(user.id, newPin))');
  }

  if (file.includes('CreateJobModal.tsx')) {
    content = content.replace(/await\s+supabase\.rpc\('search_pos_customers',\s*{\s*search_term:\s*customerSearch\s*}\)/g, 'await import("@/app/actions/pos").then(m => m.searchPosCustomersAction(customerSearch))');
    content = content.replace(/await\s+supabase\s*\n\s*\.from\('products'\)\s*\n\s*\.select\('\*'\)\s*\n\s*\.or\(`model_name\.ilike\.%\${productSearch}%,product_code\.ilike\.%\${productSearch}%`\)\s*\n\s*\.limit\(50\)/g, 'await import("@/app/actions/inventory").then(m => m.searchProductsAction(productSearch))');
    content = content.replace(/await\s+supabase\.auth\.getUser\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserAction())');
    content = content.replace(/await\s+supabase\.from\('profiles'\)\.select\('branch_id'\)\.eq\('id',\s*user\?\.id\)\.single\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserProfileAction(user?.id))');
  }

  if (file.includes('ModuleLaunchpad.tsx')) {
    content = content.replace(/await\s+supabase\.auth\.getUser\(\)/g, 'await import("@/app/actions/user").then(m => m.getUserAction())');
    content = content.replace(/await\s+supabase\.rpc\('get_unique_low_stock_count'\)/g, 'await import("@/app/actions/inventory").then(m => m.getLowStockCountAction())');
  }

  // Remove any remaining mock declarations from our earlier script
  content = content.replace(/const\s+supabase\s*=\s*{}\s*as\s+unknown/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
