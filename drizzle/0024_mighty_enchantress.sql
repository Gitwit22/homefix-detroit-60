ALTER TABLE "contractor_access_accounts" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "performs_inspections" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "performs_repairs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "supervises_training" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "repair_specialties" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "service_zip_codes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "license_expires_on" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "insurance_provider" text;--> statement-breakpoint
ALTER TABLE "contractor_access_accounts" ADD COLUMN "insurance_expires_on" text;