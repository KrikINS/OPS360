CREATE TABLE "debit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debit_note_number" text NOT NULL,
	"po_id" uuid,
	"branch_id" uuid,
	"vendor_id" uuid,
	"reason" text,
	"amount" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"serial_numbers" text[] DEFAULT '{}',
	"item_names" text[] DEFAULT '{}',
	"metadata" jsonb,
	"journal_entry_id" uuid,
	"journal_failed" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"basic" numeric NOT NULL,
	"hra" numeric DEFAULT '0' NOT NULL,
	"gross" numeric NOT NULL,
	"pf_applicable" boolean DEFAULT false NOT NULL,
	"pf_employee" numeric DEFAULT '0' NOT NULL,
	"professional_tax" numeric DEFAULT '0' NOT NULL,
	"tds_monthly" numeric DEFAULT '0' NOT NULL,
	"net" numeric NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warranty_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" uuid,
	"invoice_id" uuid,
	"purchase_date" date NOT NULL,
	"warranty_months" integer DEFAULT 12 NOT NULL,
	"warranty_expires_at" date NOT NULL,
	"notes" text,
	"registered_by" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "date_of_joining" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "basic" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "hra" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "pf_employee" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "professional_tax" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "salary_structure_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "service_jobs" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "service_jobs" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "service_jobs" ADD COLUMN "warranty_status" text DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "service_jobs" ADD COLUMN "resolution_notes" text;--> statement-breakpoint
ALTER TABLE "service_jobs" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_salary_structure_id_employee_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."employee_salary_structures"("id") ON DELETE no action ON UPDATE no action;