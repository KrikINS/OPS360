const fs = require('fs');
const path = require('path');

function getAllTables() {
  const migrationsDir = path.join(__dirname, 'src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  const tables = new Set();
  const createRegex = /CREATE TABLE (IF NOT EXISTS )?"([^"]+)"/g;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    let match;
    while ((match = createRegex.exec(content)) !== null) {
      tables.add(match[2]);
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
  
  const unknownTables = [...tables].filter(t => !wipeList.includes(t) && !userPreserveList.includes(t));
  console.log("Tables not in wipe list or preserve list:", unknownTables.join(', '));
}

getAllTables();
