ALTER TABLE "inspection_appointments" ADD COLUMN "confirmed_by_contractor_account_id" uuid;--> statement-breakpoint
ALTER TABLE "inspection_appointments" ADD COLUMN "confirmed_by_display_name" text;--> statement-breakpoint
ALTER TABLE "inspection_appointments" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "inspection_appointments" SET "confirmed_at" = "created_at";--> statement-breakpoint
ALTER TABLE "inspection_appointments" ALTER COLUMN "confirmed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "inspection_appointments" ALTER COLUMN "confirmed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inspection_appointments" ADD CONSTRAINT "inspection_appointments_confirmed_by_contractor_account_id_contractor_access_accounts_id_fk" FOREIGN KEY ("confirmed_by_contractor_account_id") REFERENCES "public"."contractor_access_accounts"("id") ON DELETE set null ON UPDATE no action;