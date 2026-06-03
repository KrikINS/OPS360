CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"corrected_by" uuid NOT NULL,
	"original_clock_in" timestamp NOT NULL,
	"original_clock_out" timestamp,
	"new_clock_in" timestamp NOT NULL,
	"new_clock_out" timestamp,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clock_in" timestamp NOT NULL,
	"clock_out" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"support_email" text,
	"billing_address" text
);
--> statement-breakpoint
CREATE TABLE "grn_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_id" uuid NOT NULL,
	"po_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ordered_qty" integer NOT NULL,
	"received_qty" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"landed_unit_cost" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grn_notes_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grn_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_number" text NOT NULL,
	"po_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"total_landed_cost" numeric(12, 2) DEFAULT '0',
	"has_discrepancy" boolean DEFAULT false,
	"condition_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hsn_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hsn_code" varchar(8) NOT NULL,
	"description" text NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"cgst_rate" numeric(5, 2) NOT NULL,
	"sgst_rate" numeric(5, 2) NOT NULL,
	"igst_rate" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "hsn_codes_hsn_code_unique" UNIQUE("hsn_code")
);
--> statement-breakpoint
CREATE TABLE "po_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ordered_qty" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"received_qty" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "serial_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"branch_id" uuid,
	"serial_number" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"transaction_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "serial_numbers_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "service_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid,
	"product_id" uuid,
	"technician_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"estimated_cost" numeric(12, 2),
	"actual_cost" numeric(12, 2),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "full_address" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "state_code" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "manager_name" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD COLUMN "po_item_id" uuid;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD COLUMN "ordered_qty" integer;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD COLUMN "received_qty" integer;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD COLUMN "shortfall" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "qty" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "unit_price" numeric;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cgst_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "sgst_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "igst_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "payment_mode" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "subtotal" numeric;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cgst" numeric;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "sgst" numeric;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "igst" numeric;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "status" text DEFAULT 'active';