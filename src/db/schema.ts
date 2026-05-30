import { pgTable, uuid, text, varchar, timestamp, boolean, integer, numeric, jsonb, primaryKey, serial } from "drizzle-orm/pg-core";


export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("USER"),
  created_at: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id),
  full_name: text("full_name"),
  email: text("email"),
  role: text("role"),
  branch_id: uuid("branch_id"),
  force_password_change: boolean("force_password_change").default(false),
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
  hsn_code: text("hsn_code"),
  min_stock_level: integer("min_stock_level").default(0),
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
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

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

export const discrepancies = pgTable("discrepancies", {
  id: uuid("id").primaryKey().defaultRandom(),
  po_id: uuid("po_id"),
  discrepancy_type: text("discrepancy_type"),
  status: text("status"),
  admin_comment: text("admin_comment"),
  created_at: timestamp("created_at").defaultNow(),
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
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
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
});

export const invoice_items = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoice_id: uuid("invoice_id"),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name"),
  email: text("email"),
  phone_number: text("phone_number"),
  address: text("address"),
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

export const company_settings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  company_name: text("company_name").notNull(),
  logo_url: text("logo_url"),
  primary_color: text("primary_color"),
  support_email: text("support_email"),
  billing_address: text("billing_address"),
});
