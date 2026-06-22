const fs = require('fs');
const path = require('path');

function parseMigrations() {
  const migrationsDir = path.join(__dirname, 'src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  const fks = [];
  const regex = /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \("([^"]+)"\) REFERENCES ("public"\.)?"([^"]+)"\("([^"]+)"\)(.*?);/g;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const child_table = match[1];
      const child_column = match[3];
      const parent_table = match[5];
      const parent_column = match[6];
      let rest = match[7] || '';
      
      let on_delete = 'no action';
      const deleteMatch = rest.match(/ON DELETE ([a-zA-Z ]+)/i);
      if (deleteMatch) on_delete = deleteMatch[1].trim();
      
      const existingIdx = fks.findIndex(fk => fk.constraint === match[2]);
      if (existingIdx !== -1) {
        fks[existingIdx] = { constraint: match[2], child_table, child_column, parent_table, parent_column, on_delete };
      } else {
        fks.push({ constraint: match[2], child_table, child_column, parent_table, parent_column, on_delete });
      }
    }
  }
  
  const wipeList = [
    "inventory", "inventory_transactions", "purchase_orders", "po_items",
    "grn_receipts", "grn_items", "discrepancies", "debit_notes", "vendor_bills",
    "vendor_payments", "vendor_audit_log", "stock_requests",
    "stock_request_items", "stock_transfers", "stock_transfer_items",
    "sales_invoices", "invoice_items", "credit_payments", "service_jobs",
    "warranty_registrations", "attendance_records", "leave_requests",
    "leave_balances", "login_attempts", "journal_entries", "journal_lines"
  ];
  
  const userPreserveList = [
    "products", "customers", "vendors", "branches", "profiles", "users", "employees",
    "user_branch_access", "hsn_codes", "categories", "brands",
    "vendor_product_map"
  ];

  console.log("=== DEPENDENCY MAP AMONG WIPE LIST ===");
  for (const table of wipeList) {
    const referencing = fks.filter(r => r.parent_table === table && wipeList.includes(r.child_table));
    if (referencing.length > 0) {
      console.log(`\nTable: ${table} is referenced by:`);
      for (const r of referencing) {
        console.log(`  - ${r.child_table}.${r.child_column} (ON DELETE ${r.on_delete})`);
      }
    }
  }

  console.log("\n=== RISK ANALYSIS: NON-WIPE TABLES REFERENCING WIPE TABLES ===");
  let riskFound = false;
  for (const r of fks) {
    // If the child is NOT being wiped, but the parent IS being wiped
    if (!wipeList.includes(r.child_table) && wipeList.includes(r.parent_table)) {
      riskFound = true;
      const isPreserved = userPreserveList.includes(r.child_table) ? "[EXPLICITLY PRESERVED]" : "[IMPLICITLY PRESERVED (Not in wipe list)]";
      console.log(`[RISK] ${isPreserved} table '${r.child_table}' references wipe-list table '${r.parent_table}'!`);
      console.log(`       -> ${r.child_table}.${r.child_column} -> ${r.parent_table}.${r.parent_column} (ON DELETE ${r.on_delete})`);
    }
  }
  if (!riskFound) {
    console.log("No non-wipe tables reference any tables in the wipe list. (SAFE)");
  }
}

parseMigrations();
