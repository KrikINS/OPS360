import { db } from "./src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT
        tc.table_name AS child_table,
        kcu.column_name AS child_column,
        ccu.table_name AS parent_table,
        ccu.column_name AS parent_column,
        rc.update_rule AS on_update,
        rc.delete_rule AS on_delete
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
  `);
  
  const rows = (result as any).rows ?? result;
  
  const wipeList = [
    "inventory", "inventory_transactions", "purchase_orders", "po_items",
    "grn_receipts", "grn_items", "discrepancies", "debit_notes", "vendor_bills",
    "vendor_payments", "vendor_audit_log", "stock_requests",
    "stock_request_items", "stock_transfers", "stock_transfer_items",
    "sales_invoices", "invoice_items", "credit_payments", "service_jobs",
    "warranty_registrations", "attendance_records", "leave_requests",
    "leave_balances", "login_attempts", "journal_entries", "journal_lines"
  ];
  
  const preserveList = [
    "products", "customers", "vendors", "branches", "profiles", "users", "employees",
    "user_branch_access", "hsn_codes", "categories", "brands",
    "vendor_product_map", "accounts", "company_settings" // adding some assumed ones just in case, but checking user list
  ];
  
  const userPreserveList = [
    "products", "customers", "vendors", "branches", "profiles", "users", "employees",
    "user_branch_access", "hsn_codes", "categories", "brands",
    "vendor_product_map"
  ];

  console.log("=== DEPENDENCY MAP FOR WIPE LIST ===");
  // For each table in wipe list, find tables that reference IT (children)
  for (const table of wipeList) {
    const referencing = rows.filter((r: any) => r.parent_table === table);
    if (referencing.length > 0) {
      console.log(`\nTable: ${table} is referenced by:`);
      for (const r of referencing) {
        console.log(`  - ${r.child_table}.${r.child_column} (ON DELETE ${r.on_delete})`);
      }
    }
  }

  console.log("\n=== PRESERVED TABLE RISK ANALYSIS ===");
  let riskFound = false;
  for (const r of rows) {
    if (userPreserveList.includes(r.child_table) && wipeList.includes(r.parent_table)) {
      riskFound = true;
      console.log(`[RISK] Preserved table '${r.child_table}' references wipe-list table '${r.parent_table}'!`);
      console.log(`       -> ${r.child_table}.${r.child_column} -> ${r.parent_table}.${r.parent_column} (ON DELETE ${r.on_delete})`);
    }
  }
  if (!riskFound) {
    console.log("No preserved tables reference any tables in the wipe list. (SAFE)");
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
