ALTER TABLE "programs" ADD COLUMN "record_type" text DEFAULT 'resident_program' NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "government_level" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "funding_source" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "application_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "matchable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "owner_occupied_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "renters_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "landlords_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "minimum_age" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "child_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "disability_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "pregnancy_qualifier" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "income_limit_type" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "max_ami" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "taxes_current_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "payment_plan_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "geographic_restriction" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "disaster_tie_back_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "benefit_type" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "resident_entry_point" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "notes" text;