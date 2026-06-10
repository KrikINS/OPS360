CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"pay_period" text NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" text NOT NULL,
	"gross_total" numeric NOT NULL,
	"tds_total" numeric DEFAULT '0' NOT NULL,
	"net_total" numeric NOT NULL,
	"notes" text,
	"journal_entry_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"staff_name" text NOT NULL,
	"staff_id" uuid,
	"gross" numeric NOT NULL,
	"tds" numeric DEFAULT '0' NOT NULL,
	"net" numeric NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sales_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"invoice_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_id" uuid,
	"qty" integer NOT NULL,
	"unit_price" numeric NOT NULL,
	"cost_price" numeric,
	"cgst" numeric DEFAULT '0' NOT NULL,
	"sgst" numeric DEFAULT '0' NOT NULL,
	"igst" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"refund_method" text NOT NULL,
	"refund_amount" numeric NOT NULL,
	"journal_entry_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "edited_by" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "edit_reason" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "original_data" jsonb;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;