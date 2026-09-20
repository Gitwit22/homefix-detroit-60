CREATE TABLE "inspection_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"confirmed_category" text NOT NULL,
	"urgency" text NOT NULL,
	"condition" text NOT NULL,
	"notes" text,
	"verified_scope" text NOT NULL,
	"estimated_cost_cents" integer,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"status" text DEFAULT 'availability_requested' NOT NULL,
	"availability_windows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_start" timestamp with time zone,
	"confirmed_end" timestamp with time zone,
	"provider_name" text,
	"provider_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_matches" ADD COLUMN "screening_results" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "program_matches" ADD COLUMN "screened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "evidence_stage" text DEFAULT 'resident_report' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "completion_notes" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_findings_inspection_repair_need_unique" ON "inspection_findings" USING btree ("inspection_id","repair_need_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspections_repair_case_id_unique" ON "inspections" USING btree ("repair_case_id");