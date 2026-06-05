CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_id" uuid,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "customer_type" text DEFAULT 'walk_in';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "loyalty_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "cost_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "discount_pct" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mrp" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dealer_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_sell_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "margin_pct" numeric(5, 2) DEFAULT '5';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_discount_pct" numeric(5, 2) DEFAULT '10';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pos_pin" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;