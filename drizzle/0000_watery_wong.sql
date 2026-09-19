CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_url" text,
	"status" text DEFAULT 'missing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"street_address" text NOT NULL,
	"city" text DEFAULT 'Detroit' NOT NULL,
	"state" text DEFAULT 'MI' NOT NULL,
	"zip_code" text NOT NULL,
	"occupancy_type" text NOT NULL,
	"primary_residence" boolean DEFAULT true NOT NULL,
	"years_at_property" integer,
	"household_size" integer,
	"income_range" text,
	"applicant_age" integer,
	"senior_household" boolean DEFAULT false NOT NULL,
	"children_in_household" boolean DEFAULT false NOT NULL,
	"accessibility_needs" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"match_status" text NOT NULL,
	"explanation" text,
	"missing_requirements" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_repair_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"repair_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"operator" text NOT NULL,
	"value" jsonb NOT NULL,
	"required" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"organization" text NOT NULL,
	"description" text,
	"source_url" text,
	"application_status" text DEFAULT 'unknown' NOT NULL,
	"application_open_date" timestamp with time zone,
	"application_close_date" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"predicted_category" text,
	"urgency" text,
	"summary" text,
	"observations" jsonb,
	"safety_flags" jsonb,
	"follow_up_questions" jsonb,
	"confidence" numeric,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"case_number" text NOT NULL,
	"status" text DEFAULT 'assessment_started' NOT NULL,
	"current_step" text DEFAULT 'intake' NOT NULL,
	"next_action" text,
	"coverage_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "repair_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"started_when" text,
	"getting_worse" boolean DEFAULT false NOT NULL,
	"safe_to_occupy" boolean DEFAULT true NOT NULL,
	"urgency" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'reported' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_matches" ADD CONSTRAINT "program_matches_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_matches" ADD CONSTRAINT "program_matches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_repair_types" ADD CONSTRAINT "program_repair_types_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_rules" ADD CONSTRAINT "program_rules_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_assessments" ADD CONSTRAINT "repair_assessments_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_cases" ADD CONSTRAINT "repair_cases_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_needs" ADD CONSTRAINT "repair_needs_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD CONSTRAINT "repair_photos_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;