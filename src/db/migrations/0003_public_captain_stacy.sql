CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" uuid,
	"branch_id" uuid,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "expense_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"expense_account" text NOT NULL,
	"payment_account" text DEFAULT '1010' NOT NULL,
	"description" text NOT NULL,
	"receipt_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"journal_entry_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"reference_source" text NOT NULL,
	"reference_id" text,
	"branch_id" uuid NOT NULL,
	"financial_year" text NOT NULL,
	"status" text DEFAULT 'posted' NOT NULL,
	"auto_generated" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"journal_line_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"description" text
);
--> statement-breakpoint
CREATE TABLE "vendor_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_method" text DEFAULT 'bank' NOT NULL,
	"reference_number" text,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"journal_entry_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "inventory_ids" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "invoice_id" uuid;