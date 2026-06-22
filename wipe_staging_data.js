const { Client } = require('pg');

async function wipeStaging() {
  // Using the connection string from .env.staging
  const client = new Client({ 
    connectionString: 'postgresql://postgres:AppTerra360@127.0.0.1:5433/ops360_staging',
    connectionTimeoutMillis: 5000
  });

  try {
    console.log("Connecting to staging database...");
    await client.connect();

    console.log("Starting deletion sequence...");

    const wipeQueries = [
      // Journal
      "DELETE FROM journal_lines;",
      "DELETE FROM journal_entries;",

      // Sales
      "DELETE FROM sales_return_items;",
      "DELETE FROM sales_returns;",
      "DELETE FROM credit_payments;",
      "DELETE FROM invoice_items;",
      "DELETE FROM sales_invoices;",

      // Inventory
      "DELETE FROM inventory_transactions;",
      "DELETE FROM inventory;",

      // Procurement
      "DELETE FROM debit_notes;",
      "DELETE FROM discrepancies;",
      "DELETE FROM grn_items;",
      "DELETE FROM grn_receipts;",
      "DELETE FROM vendor_bills;",
      "DELETE FROM vendor_payments;",
      "DELETE FROM vendor_audit_log;",
      "DELETE FROM po_items;",
      "DELETE FROM purchase_orders;",

      // Transfers
      "DELETE FROM stock_transfer_items;",
      "DELETE FROM stock_transfers;",
      "DELETE FROM stock_request_items;",
      "DELETE FROM stock_requests;",

      // Service
      "DELETE FROM service_jobs;",
      "DELETE FROM warranty_registrations;",

      // HR/Attendance
      "DELETE FROM attendance_records;",
      "DELETE FROM leave_requests;",
      "DELETE FROM leave_balances;",

      // Security
      "DELETE FROM login_attempts;"
    ];

    await client.query('BEGIN');
    for (const query of wipeQueries) {
      console.log(`Executing: ${query}`);
      const res = await client.query(query);
      console.log(` -> Deleted ${res.rowCount} rows`);
    }
    await client.query('COMMIT');

    console.log("Successfully wiped staging transactional data.");

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("Error during wipe:", error);
  } finally {
    await client.end();
  }
}

wipeStaging();
