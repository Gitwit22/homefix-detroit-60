CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"contractor_name" text NOT NULL,
	"company_name" text NOT NULL,
	"estimated_price_cents" integer NOT NULL,
	"estimated_duration_days" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"work_order_number" text NOT NULL,
	"repair_type" text NOT NULL,
	"scope" text NOT NULL,
	"priority" text NOT NULL,
	"funding_status" text DEFAULT 'program_approved' NOT NULL,
	"capacity_status" text DEFAULT 'overflow' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_work_order_number_unique" UNIQUE("work_order_number")
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;