import { pgTable, uuid, text, varchar, timestamp, boolean, integer, numeric, jsonb, primaryKey, serial, date, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("USER"),
  created_at: timestamp("created_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").default('active').notNull(),
  created_at: timestamp("created_at").defaultNow(),
  designation:     text("designation"),
  department:      text("department"),
  date_of_joining: date("date_of_joining"),
  branch_id:       uuid("branch_id").references(() => branches.id),
});

export const employee_salary_structures = pgTable('employee_salary_structures', {
  id:               uuid('id').primaryKey().defaultRandom(),
  employee_id:      uuid('employee_id').notNull().references(() => employees.id),
  effective_from:   date('effective_from').notNull(),
  basic:            numeric('basic').notNull(),
  hra:              numeric('hra').notNull().default('0'),
  gross:            numeric('gross').notNull(),
  pf_applicable:    boolean('pf_applicable').notNull().default(false),
  pf_employee:      numeric('pf_employee').notNull().default('0'),
  professional_tax: numeric('professional_tax').notNull().default('0'),
  tds_monthly:      numeric('tds_monthly').notNull().default('0'),
  net:              numeric('net').notNull(),
  is_active:        boolean('is_active').notNull().default(true),
  created_by:       uuid('created_by').notNull(),
  created_at:       timestamp('created_at').defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id),
  full_name: text("full_name"),
  email: text("email"),
  role: text("role"),
  branch_id: uuid("branch_id"),
  pos_pin: text("pos_pin"),
  force_password_change: boolean("force_password_change").default(false),
  employee_id: uuid("employee_id").references(() => employees.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code"),
  full_address: text("full_address"),
  city: text("city"),
  state: text("state"),
  state_code: text("state_code"),
  pincode: text("pincode"),
  manager_name: text("manager_name"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  location: text("location"),
  type: text("type"),
  created_at: timestamp("created_at").defaultNow(),
});

export const user_branch_access = pgTable("user_branch_access", {
  user_id: uuid("user_id").notNull(),
  branch_id: uuid("branch_id").notNull(),
  is_primary: boolean("is_primary").default(false),
}, (t) => [primaryKey({ columns: [t.user_id, t.branch_id] })]);

export const user_permissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  module: text("module").notNull(),
  enabled: boolean("enabled").default(false),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  model_name: text("model_name").notNull(),
  brand: text("brand"),
  category: text("category"),
  product_code: text("product_code"),
  base_price: numeric("base_price"),
  mrp: numeric("mrp", { precision: 12, scale: 2 }),
  dealer_price: numeric("dealer_price", { precision: 12, scale: 2 }),
  min_sell_price: numeric("min_sell_price", { precision: 12, scale: 2 }),
  margin_pct: numeric("margin_pct", { precision: 5, scale: 2 }).default('5'),
  max_discount_pct: numeric("max_discount_pct", { precision: 5, scale: 2 }).default('10'),
  hsn_code: text("hsn_code"),
  min_stock_level: integer("min_stock_level").default(0),
  vendor_id: uuid("vendor_id"),
  tracking_type: text("tracking_type"),
  description: text("description"),
  gst_rate: numeric("gst_rate").default("18"),
  warranty_months: integer("warranty_months"),
  is_archived: boolean("is_archived").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_id: uuid("product_id"),
  branch_id: uuid("branch_id"),
  serial_number: text("serial_number"),
  status: text("status").default("Available"),
  price: numeric("price"),
  landed_cost: numeric("landed_cost"),
  source_po_id: uuid("source_po_id"),
  invoice_id: uuid("invoice_id"),
  invoice_item_id: uuid("invoice_item_id").references(() => invoice_items.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  fifoIdx: index("inventory_fifo_idx").on(
    table.product_id,
    table.branch_id,
    table.status,
    table.created_at
  ),
  branchStatusIdx: index("inventory_branch_status_idx").on(table.branch_id, table.status),
}));

export const purchase_orders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  po_number: text("po_number"),
  status: text("status"),
  vendor_id: uuid("vendor_id"),
  branch_id: uuid("branch_id"),
  created_by: uuid("created_by"),
  approved_by: uuid("approved_by"),
  terms_content: text("terms_content"),
  payment_terms: text("payment_terms"),
  is_partial_billing: boolean("is_partial_billing").default(false),
  total_amount: numeric("total_amount"),
  cgst_amount: numeric("cgst_amount", { precision: 12, scale: 2 }).default('0'),
  sgst_amount: numeric("sgst_amount", { precision: 12, scale: 2 }).default('0'),
  igst_amount: numeric("igst_amount", { precision: 12, scale: 2 }).default('0'),
  cancellation_reason: text("cancellation_reason"),
  revision_notes: text("revision_notes"),
  vendor_bill_amount: numeric("vendor_bill_amount"),
  bill_url: text("bill_url"),
  invoice_url: text("invoice_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const vendor_bills = pgTable("vendor_bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  po_id: uuid("po_id"),
  bill_number: text("bill_number"),
  bill_amount: numeric("bill_amount"),
  file_path: text("file_path"),
  created_at: timestamp("created_at").defaultNow(),
});

export const vendor_payments = pgTable("vendor_payments", {
  id:               uuid("id").primaryKey().defaultRandom(),
  po_id:            uuid("po_id").notNull(),
  vendor_id:        uuid("vendor_id").notNull(),
  branch_id:        uuid("branch_id").notNull(),
  amount:           numeric("amount", { precision: 15, scale: 2 }).notNull(),
  payment_method:   text("payment_method").notNull().default('bank'), // bank|cash|upi|cheque
  reference_number: text("reference_number"),   // cheque/UTR/UPI ref
  payment_date:     timestamp("payment_date").notNull().defaultNow(),
  notes:            text("notes"),
  journal_entry_id: uuid("journal_entry_id"),   // set after posting
  created_by:       uuid("created_by").notNull(),
  created_at:       timestamp("created_at").defaultNow(),
}, (table) => ({
  poIdIdx: index("vendor_payments_po_id_idx").on(table.po_id),
  vendorIdIdx: index("vendor_payments_vendor_id_idx").on(table.vendor_id),
}));

export const discrepancies = pgTable("discrepancies", {
  id: uuid("id").primaryKey().defaultRandom(),
  po_id: uuid("po_id"),
  discrepancy_type: text("discrepancy_type"),
  status: text("status"),
  admin_comment: text("admin_comment"),
  created_at: timestamp("created_at").defaultNow(),
  product_id: uuid("product_id"),
  po_item_id: uuid("po_item_id"),
  ordered_qty: integer("ordered_qty"),
  received_qty: integer("received_qty"),
  shortfall: integer("shortfall"),
  resolved_at: timestamp("resolved_at"),
});

export const app_settings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const stock_requests = pgTable("stock_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  source_branch_id: uuid("source_branch_id"),
  requesting_branch_id: uuid("requesting_branch_id"),
  request_number: text("request_number"),
  status: text("status"),
  priority: text("priority").default('Low'),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    differentBranchesCheck: check("stock_requests_different_branches", sql`${table.source_branch_id} != ${table.requesting_branch_id}`)
  }
});

export const stock_request_items = pgTable("stock_request_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  request_id: uuid("request_id").notNull(),
  product_id: uuid("product_id"),
  quantity: integer("quantity").notNull(),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    requestIdIdx: index("stock_request_items_request_id_idx").on(table.request_id),
  }
});

export const stock_transfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  transfer_number: text("transfer_number"),
  source_branch_id: uuid("source_branch_id"),
  destination_branch_id: uuid("destination_branch_id"),
  originator_id: uuid("originator_id"),
  condition_notes: text("condition_notes"),
  stock_request_id: uuid("stock_request_id"),
  status: text("status"),
  created_at: timestamp("created_at").defaultNow(),
});

export const stock_transfer_items = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transfer_id: uuid("transfer_id"),
  product_id: uuid("product_id"),
  inventory_id: uuid("inventory_id"),
  serial_number: text("serial_number"),
});

export const inventory_transactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_id: uuid("product_id"),
  branch_id: uuid("branch_id"),
  transaction_type: text("transaction_type"),
  quantity: integer("quantity"),
  reference_id: uuid("reference_id"),
  created_by: uuid("created_by"),
  inventory_id: uuid("inventory_id"),
  serial_number: text("serial_number"),
  created_at: timestamp("created_at").defaultNow(),
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  trade_name: text("trade_name"),
  gstin: text("gstin"),
  pan_number: text("pan_number"),
  contact_person: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  state_code: text("state_code"),
  state: text("state"),
  bank_details: jsonb("bank_details"),
  payment_terms: text("payment_terms"),
  credit_limit: numeric("credit_limit"),
  category: text("category"),
  brand_ids: jsonb("brand_ids"),
  category_ids: jsonb("category_ids"),
  status: text("status"),
  compliance_status: text("compliance_status"),
  created_by: uuid("created_by"),
  approved_by: uuid("approved_by"),
  created_at: timestamp("created_at").defaultNow(),
});

export const vendor_audit_log = pgTable("vendor_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendor_id: uuid("vendor_id"),
  changed_by: uuid("changed_by"),
  field_name: text("field_name"),
  old_value: text("old_value"),
  new_value: text("new_value"),
  created_at: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const po_terms_templates = pgTable("po_terms_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  is_default: boolean("is_default").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Finance & Accounts ──────────────────────────────

export const accounts = pgTable("accounts", {
  id:         uuid("id").primaryKey().defaultRandom(),
  code:       text("code").notNull().unique(),
  name:       text("name").notNull(),
  type:       text("type").notNull(),
  parent_id:  uuid("parent_id"),
  branch_id:  uuid("branch_id"),
  is_system:  boolean("is_system").default(false),
  is_active:  boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
})

export const journal_entries = pgTable("journal_entries", {
  id:               uuid("id").primaryKey().defaultRandom(),
  date:             timestamp("date").notNull().defaultNow(),
  description:      text("description").notNull(),
  reference_source: text("reference_source").notNull(),
  reference_id:     text("reference_id"),
  branch_id:        uuid("branch_id").notNull(),
  financial_year:   text("financial_year").notNull(),
  status:           text("status").notNull().default('posted'),
  auto_generated:   boolean("auto_generated").default(false),
  created_by:       uuid("created_by").notNull(),
  created_at:       timestamp("created_at").defaultNow(),
  edited_at:        timestamp("edited_at"),
  edited_by:        uuid("edited_by"),
  edit_reason:      text("edit_reason"),
  original_data:    jsonb("original_data"),
}, (table) => ({
  statusDateIdx: index("journal_entries_status_date_idx").on(table.status, table.date),
  referenceIdIdx: index("journal_entries_reference_id_idx").on(table.reference_id),
}))

export const journal_lines = pgTable("journal_lines", {
  id:               uuid("journal_line_id").primaryKey().defaultRandom(),
  journal_entry_id: uuid("journal_entry_id").notNull(),
  account_id:       uuid("account_id").notNull(),
  debit:            numeric("debit", { precision: 15, scale: 2 }).default("0"),
  credit:           numeric("credit", { precision: 15, scale: 2 }).default("0"),
  description:      text("description"),
}, (table) => ({
  journalEntryIdIdx: index("journal_lines_journal_entry_id_idx").on(table.journal_entry_id),
  accountIdIdx: index("journal_lines_account_id_idx").on(table.account_id),
}))

export const expense_records = pgTable("expense_records", {
  id:               uuid("id").primaryKey().defaultRandom(),
  branch_id:        uuid("branch_id").notNull(),
  created_by:       uuid("created_by").notNull(),
  amount:           numeric("amount", { precision: 15, scale: 2 }).notNull(),
  expense_account:  text("expense_account").notNull(),
  payment_account:  text("payment_account").notNull().default('1010'),
  description:      text("description").notNull(),
  receipt_url:      text("receipt_url"),
  status:           text("status").notNull().default('pending'),
  approved_by:      uuid("approved_by"),
  approved_at:      timestamp("approved_at"),
  journal_entry_id: uuid("journal_entry_id"),
  created_at:       timestamp("created_at").defaultNow(),
}, (table) => ({
  branchStatusIdx: index("expense_records_branch_status_idx").on(table.branch_id, table.status),
}))

export const debit_notes = pgTable('debit_notes', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  debit_note_number:  text('debit_note_number').notNull(),
  po_id:              uuid('po_id').references(() => purchase_orders.id),
  branch_id:          uuid('branch_id').references(() => branches.id),
  vendor_id:          uuid('vendor_id').references(() => vendors.id),
  reason:             text('reason'),
  amount:             numeric('amount').notNull().default('0'),
  status:             text('status').notNull().default('Pending'),
  serial_numbers:     text('serial_numbers').array().default([]),
  item_names:         text('item_names').array().default([]),
  metadata:           jsonb('metadata'),
  journal_entry_id:   uuid('journal_entry_id'),
  journal_failed:     boolean('journal_failed').default(false),
  created_by:         uuid('created_by').notNull(),
  created_at:         timestamp('created_at').defaultNow(),
})

export const grn_notes_templates = pgTable("grn_notes_templates", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  content:    text("content").notNull(),
  is_default: boolean("is_default").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const return_reason_master = pgTable("return_reason_master", {
  id: uuid("id").primaryKey().defaultRandom(),
  reason_text: text("reason_text").notNull(),
  is_active: boolean("is_active").default(true),
});

export const sales_invoices = pgTable("sales_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  customer_id: uuid("customer_id"),
  invoice_number: text("invoice_number"),
  total_amount: numeric("total_amount"),
  created_at: timestamp("created_at").defaultNow(),
  branch_id: uuid("branch_id"),
  payment_mode: text("payment_mode"),
  due_date:       date('due_date'),
  amount_paid:    numeric('amount_paid').notNull().default('0'),
  payment_status: text('payment_status').notNull().default('paid'),
  user_id: uuid("user_id"),
  subtotal: numeric("subtotal"),
  cgst: numeric("cgst"),
  sgst: numeric("sgst"),
  igst: numeric("igst"),
  status: text("status").default('active'),
}, (table) => ({
  branchCreatedIdx: index("sales_invoices_branch_created_idx").on(table.branch_id, table.created_at),
  customerIdIdx: index("sales_invoices_customer_id_idx").on(table.customer_id),
}));

export const invoice_items = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoice_id: uuid("invoice_id"),
  product_id: uuid("product_id"),
  qty: integer("qty"),
  unit_price: numeric("unit_price"),
  cost_price: numeric("cost_price", { precision: 12, scale: 2 }),
  discount_amount: numeric("discount_amount", { precision: 12, scale: 2 }).default('0'),
  discount_pct: numeric("discount_pct", { precision: 5, scale: 2 }).default('0'),
  approved_by: uuid("approved_by"),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name"),
  email: text("email"),
  phone_number: text("phone_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  gstin: text("gstin"),
  customer_type: text("customer_type", { enum: ['retail', 'distributor', 'walk_in'] }).default('walk_in'),
  company_name: text("company_name"),
  notes: text("notes"),
  loyalty_balance: integer("loyalty_balance").notNull().default(0),
  is_credit_eligible:   boolean('is_credit_eligible').notNull().default(false),
  credit_limit:         numeric('credit_limit').default('0'),
  credit_balance:       numeric('credit_balance').notNull().default('0'),
  credit_payment_terms: text('credit_payment_terms').default('30 days'),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const loyalty_points = pgTable("loyalty_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  customer_id: uuid("customer_id").notNull(),
  invoice_id: uuid("invoice_id"),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  balance_after: integer("balance_after").notNull(),
  description: text("description"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at").defaultNow(),
});


export const sequential_counters = pgTable("sequential_counters", {
  prefix: text("prefix").notNull(),
  year: integer("year").notNull(),
  current_value: integer("current_value").default(0),
}, (t) => [primaryKey({ columns: [t.prefix, t.year] })]);

export const hsn_codes = pgTable("hsn_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  hsn_code: varchar("hsn_code", { length: 8 }).notNull().unique(),
  description: text("description").notNull(),
  gst_rate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  cgst_rate: numeric("cgst_rate", { precision: 5, scale: 2 }).notNull(),
  sgst_rate: numeric("sgst_rate", { precision: 5, scale: 2 }).notNull(),
  igst_rate: numeric("igst_rate", { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const serialNumbers = pgTable("serial_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id"),
  branchId: uuid("branch_id"),
  serialNumber: text("serial_number").notNull().unique(),
  status: text("status").notNull().default("available"),
  transactionId: uuid("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const company_settings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  company_name: text("company_name").notNull(),
  logo_url: text("logo_url"),
  primary_color: text("primary_color"),
  support_email: text("support_email"),
  billing_address: text("billing_address"),
});

export const po_items = pgTable("po_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  po_id: uuid("po_id").notNull(),
  product_id: uuid("product_id").notNull(),
  ordered_qty: integer("ordered_qty").notNull(),
  unit_cost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  received_qty: integer("received_qty").default(0),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  poIdIdx: index("po_items_po_id_idx").on(table.po_id),
}))

export const grn_receipts = pgTable("grn_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  grn_number: text("grn_number").notNull(),
  po_id: uuid("po_id").notNull(),
  branch_id: uuid("branch_id").notNull(),
  created_by: uuid("created_by").notNull(),
  total_landed_cost: numeric("total_landed_cost", { precision: 12, scale: 2 }).default('0'),
  has_discrepancy: boolean("has_discrepancy").default(false),
  condition_notes: text("condition_notes"),
  created_at: timestamp("created_at").defaultNow(),
})

export const grn_items = pgTable("grn_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  grn_id: uuid("grn_id").notNull(),
  po_item_id: uuid("po_item_id").notNull(),
  product_id: uuid("product_id").notNull(),
  ordered_qty: integer("ordered_qty").notNull(),
  received_qty: integer("received_qty").notNull(),
  unit_cost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  landed_unit_cost: numeric("landed_unit_cost", { precision: 12, scale: 2 }).default('0'),
  inventory_ids: text("inventory_ids").array().default(sql`'{}'::text[]`),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  poItemIdIdx: index("grn_items_po_item_id_idx").on(table.po_item_id),
}))

export const attendance_records = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  branch_id: uuid("branch_id").notNull(),
  date: date("date").notNull(),
  clock_in: timestamp("clock_in").notNull(),
  clock_out: timestamp("clock_out"),
  duration_minutes: integer("duration_minutes"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
})

export const attendance_corrections = pgTable("attendance_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  attendance_id: uuid("attendance_id").notNull(),
  corrected_by: uuid("corrected_by").notNull(),
  original_clock_in: timestamp("original_clock_in").notNull(),
  original_clock_out: timestamp("original_clock_out"),
  new_clock_in: timestamp("new_clock_in").notNull(),
  new_clock_out: timestamp("new_clock_out"),
  reason: text("reason").notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const leave_types = pgTable('leave_types', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  days_per_year: integer('days_per_year').notNull().default(0),
  is_active:    boolean('is_active').notNull().default(true),
  created_at:   timestamp('created_at').defaultNow(),
})

export const leave_balances = pgTable('leave_balances', {
  id:            uuid('id').primaryKey().defaultRandom(),
  employee_id:   uuid('employee_id').notNull().references(() => profiles.id),
  leave_type_id: uuid('leave_type_id').notNull().references(() => leave_types.id),
  year:          integer('year').notNull(),
  allocated:     integer('allocated').notNull().default(0),
  used:          integer('used').notNull().default(0),
  created_at:    timestamp('created_at').defaultNow(),
})

export const leave_requests = pgTable('leave_requests', {
  id:               uuid('id').primaryKey().defaultRandom(),
  employee_id:      uuid('employee_id').notNull().references(() => profiles.id),
  leave_type_id:    uuid('leave_type_id').notNull().references(() => leave_types.id),
  from_date:        date('from_date').notNull(),
  to_date:          date('to_date').notNull(),
  days:             integer('days').notNull(),
  reason:           text('reason'),
  status:           text('status').notNull().default('pending'),
  approved_by:      uuid('approved_by').references(() => profiles.id),
  approved_at:      timestamp('approved_at'),
  rejection_reason: text('rejection_reason'),
  created_at:       timestamp('created_at').defaultNow(),
})
export const service_jobs = pgTable("service_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  job_id: text("job_id").notNull().unique(),
  branch_id: uuid("branch_id").notNull(),
  customer_id: uuid("customer_id"),
  product_id: uuid("product_id"),
  technician_id: uuid("technician_id"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default('Medium'),
  status: text("status").notNull().default('Pending'),
  estimated_cost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  actual_cost: numeric("actual_cost", { precision: 12, scale: 2 }),
  created_by: uuid("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  serial_number:     text("serial_number"),
  invoice_id:        uuid("invoice_id"),
  warranty_status:   text("warranty_status").default('unknown'),
  resolution_notes:  text("resolution_notes"),
  completed_at:      timestamp("completed_at"),
})

export const service_job_items = pgTable("service_job_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  job_id: uuid("job_id").notNull(),
  product_id: uuid("product_id").notNull(),
  qty: integer("qty").notNull().default(1),
  unit_cost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const warranty_registrations = pgTable('warranty_registrations', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  serial_number:       text('serial_number').notNull(),
  product_id:          uuid('product_id').notNull(),
  customer_id:         uuid('customer_id'),
  invoice_id:          uuid('invoice_id'),
  purchase_date:       date('purchase_date').notNull(),
  warranty_months:     integer('warranty_months').notNull().default(12),
  warranty_expires_at: date('warranty_expires_at').notNull(),
  notes:               text('notes'),
  registered_by:       uuid('registered_by').notNull(),
  is_active:           boolean('is_active').notNull().default(true),
  created_at:          timestamp('created_at').defaultNow(),
})

// ── Sales Returns / Credit Notes ─────────────────────
export const sales_returns = pgTable('sales_returns', {
  id:               uuid('id').primaryKey().defaultRandom(),
  invoice_id:       uuid('invoice_id').notNull()
                      .references(() => sales_invoices.id),
  branch_id:        uuid('branch_id').notNull()
                      .references(() => branches.id),
  created_by:       uuid('created_by').notNull(),
  reason:           text('reason').notNull(),
  refund_method:    text('refund_method').notNull(),
  refund_amount:    numeric('refund_amount').notNull(),
  journal_entry_id: uuid('journal_entry_id'),
  created_at:       timestamp('created_at').defaultNow(),
})

export const credit_payments = pgTable('credit_payments', {
  id:               uuid('id').primaryKey().defaultRandom(),
  invoice_id:       uuid('invoice_id').notNull().references(() => sales_invoices.id),
  customer_id:      uuid('customer_id').notNull().references(() => customers.id),
  amount:           numeric('amount').notNull(),
  payment_mode:     text('payment_mode').notNull().default('cash'),
  notes:            text('notes'),
  journal_entry_id: uuid('journal_entry_id'),
  created_by:       uuid('created_by').notNull(),
  created_at:       timestamp('created_at').defaultNow(),
})

export const sales_return_items = pgTable('sales_return_items', {
  id:              uuid('id').primaryKey().defaultRandom(),
  return_id:       uuid('return_id').notNull()
                     .references(() => sales_returns.id),
  invoice_item_id: uuid('invoice_item_id').notNull(),
  product_id:      uuid('product_id').notNull()
                     .references(() => products.id),
  inventory_id:    uuid('inventory_id'),
  qty:             integer('qty').notNull(),
  unit_price:      numeric('unit_price').notNull(),
  cost_price:      numeric('cost_price'),
  cgst:            numeric('cgst').notNull().default('0'),
  sgst:            numeric('sgst').notNull().default('0'),
  igst:            numeric('igst').notNull().default('0'),
  disposition:     text('disposition').notNull().default('resellable'),
})

// ── Payroll ──────────────────────────────────────────
export const payroll_runs = pgTable('payroll_runs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  branch_id:        uuid('branch_id').notNull()
                      .references(() => branches.id),
  pay_period:       text('pay_period').notNull(),
  payment_date:     date('payment_date').notNull(),
  payment_method:   text('payment_method').notNull(),
  gross_total:      numeric('gross_total').notNull(),
  tds_total:        numeric('tds_total').notNull().default('0'),
  net_total:        numeric('net_total').notNull(),
  notes:            text('notes'),
  journal_entry_id: uuid('journal_entry_id'),
  created_by:       uuid('created_by').notNull(),
  created_at:       timestamp('created_at').defaultNow(),
  status:           text('status').notNull().default('draft'),
})

export const payslips = pgTable('payslips', {
  id:             uuid('id').primaryKey().defaultRandom(),
  payroll_run_id: uuid('payroll_run_id').notNull()
                    .references(() => payroll_runs.id),
  staff_name:     text('staff_name').notNull(),
  staff_id:       uuid('staff_id'),
  gross:          numeric('gross').notNull(),
  tds:            numeric('tds').notNull().default('0'),
  net:            numeric('net').notNull(),
  notes:          text('notes'),
  basic:                numeric('basic').notNull().default('0'),
  hra:                  numeric('hra').notNull().default('0'),
  pf_employee:          numeric('pf_employee').notNull().default('0'),
  professional_tax:     numeric('professional_tax').notNull().default('0'),
  salary_structure_id:  uuid('salary_structure_id').references(() => employee_salary_structures.id),
})
