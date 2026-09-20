CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_number" text NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"repair_need_id" uuid NOT NULL,
	"program_id" uuid,
	"type" text NOT NULL,
	"repair_category" text NOT NULL,
	"priority" text NOT NULL,
	"public_scope" text NOT NULL,
	"zip_code" text NOT NULL,
	"funding_status" text,
	"training_opportunity_status" text,
	"potential_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"published_by_user_id" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_public_number_unique" UNIQUE("public_number")
);
--> statement-breakpoint
CREATE TABLE "opportunity_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"opportunity_response_id" uuid,
	"provider_organization_id" uuid NOT NULL,
	"assigned_user_id" uuid NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_photo_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"repair_photo_id" uuid NOT NULL,
	"approved_by_user_id" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"provider_organization_id" uuid NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"response_type" text NOT NULL,
	"estimated_price_cents" integer,
	"estimated_duration_days" integer,
	"notes" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_identity_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_organization_id" uuid NOT NULL,
	"user_identity_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_organization_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"performs_inspections" boolean DEFAULT false NOT NULL,
	"performs_repairs" boolean DEFAULT false NOT NULL,
	"supervises_training" boolean DEFAULT false NOT NULL,
	"repair_specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_organizations_clerk_organization_id_unique" UNIQUE("clerk_organization_id")
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_repair_need_id_repair_needs_id_fk" FOREIGN KEY ("repair_need_id") REFERENCES "public"."repair_needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_published_by_user_id_user_identities_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_assignments" ADD CONSTRAINT "opportunity_assignments_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_assignments" ADD CONSTRAINT "opportunity_assignments_opportunity_response_id_opportunity_responses_id_fk" FOREIGN KEY ("opportunity_response_id") REFERENCES "public"."opportunity_responses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_assignments" ADD CONSTRAINT "opportunity_assignments_provider_organization_id_provider_organizations_id_fk" FOREIGN KEY ("provider_organization_id") REFERENCES "public"."provider_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_assignments" ADD CONSTRAINT "opportunity_assignments_assigned_user_id_user_identities_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_assignments" ADD CONSTRAINT "opportunity_assignments_assigned_by_user_id_user_identities_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_photo_releases" ADD CONSTRAINT "opportunity_photo_releases_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_photo_releases" ADD CONSTRAINT "opportunity_photo_releases_repair_photo_id_repair_photos_id_fk" FOREIGN KEY ("repair_photo_id") REFERENCES "public"."repair_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_photo_releases" ADD CONSTRAINT "opportunity_photo_releases_approved_by_user_id_user_identities_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_responses" ADD CONSTRAINT "opportunity_responses_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_responses" ADD CONSTRAINT "opportunity_responses_provider_organization_id_provider_organizations_id_fk" FOREIGN KEY ("provider_organization_id") REFERENCES "public"."provider_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_responses" ADD CONSTRAINT "opportunity_responses_submitted_by_user_id_user_identities_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_responses" ADD CONSTRAINT "opportunity_responses_reviewed_by_user_id_user_identities_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_memberships" ADD CONSTRAINT "partner_memberships_user_identity_id_user_identities_id_fk" FOREIGN KEY ("user_identity_id") REFERENCES "public"."user_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_memberships" ADD CONSTRAINT "provider_memberships_provider_organization_id_provider_organizations_id_fk" FOREIGN KEY ("provider_organization_id") REFERENCES "public"."provider_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_memberships" ADD CONSTRAINT "provider_memberships_user_identity_id_user_identities_id_fk" FOREIGN KEY ("user_identity_id") REFERENCES "public"."user_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunities_public_list_idx" ON "opportunities" USING btree ("status","type","created_at");--> statement-breakpoint
CREATE INDEX "opportunities_zip_category_idx" ON "opportunities" USING btree ("zip_code","repair_category");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_active_need_type_unique" ON "opportunities" USING btree ("repair_need_id","type") WHERE "opportunities"."status" not in ('completed', 'cancelled');--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_assignments_active_opportunity_unique" ON "opportunity_assignments" USING btree ("opportunity_id") WHERE "opportunity_assignments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "opportunity_assignments_provider_status_idx" ON "opportunity_assignments" USING btree ("provider_organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_photo_releases_opportunity_photo_unique" ON "opportunity_photo_releases" USING btree ("opportunity_id","repair_photo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_responses_opportunity_provider_unique" ON "opportunity_responses" USING btree ("opportunity_id","provider_organization_id");--> statement-breakpoint
CREATE INDEX "opportunity_responses_review_queue_idx" ON "opportunity_responses" USING btree ("opportunity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_memberships_user_unique" ON "partner_memberships" USING btree ("user_identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_memberships_organization_user_unique" ON "provider_memberships" USING btree ("provider_organization_id","user_identity_id");--> statement-breakpoint
INSERT INTO "opportunities" (
	"id",
	"public_number",
	"repair_case_id",
	"repair_need_id",
	"program_id",
	"type",
	"repair_category",
	"priority",
	"public_scope",
	"zip_code",
	"funding_status",
	"status",
	"published_at",
	"created_at",
	"updated_at"
)
SELECT
	work_order."id",
	work_order."work_order_number",
	work_order."repair_case_id",
	work_order."repair_need_id",
	work_order."program_id",
	'repair',
	work_order."repair_type",
	work_order."priority",
	'Assess and complete the approved ' || replace(work_order."repair_type", '_', ' ') || ' repair scope.',
	home."zip_code",
	work_order."funding_status",
	CASE
		WHEN work_order."status" = 'bids_received' THEN 'responses_received'
		WHEN work_order."status" = 'assigned' THEN 'assigned'
		WHEN work_order."status" = 'in_progress' THEN 'in_progress'
		WHEN work_order."status" = 'completed' THEN 'completed'
		WHEN work_order."status" = 'cancelled' THEN 'cancelled'
		ELSE 'open'
	END,
	work_order."created_at",
	work_order."created_at",
	work_order."updated_at"
FROM "work_orders" work_order
INNER JOIN "repair_cases" repair_case ON repair_case."id" = work_order."repair_case_id"
INNER JOIN "homes" home ON home."id" = repair_case."home_id"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "opportunities" (
	"id",
	"public_number",
	"repair_case_id",
	"repair_need_id",
	"program_id",
	"type",
	"repair_category",
	"priority",
	"public_scope",
	"zip_code",
	"funding_status",
	"status",
	"published_at",
	"created_at",
	"updated_at"
)
SELECT
	work_order."id",
	work_order."work_order_number",
	work_order."repair_case_id",
	work_order."repair_need_id",
	work_order."program_id",
	'repair',
	repair_need."category",
	work_order."priority",
	'Assess and complete the approved ' || replace(repair_need."category", '_', ' ') || ' repair scope.',
	home."zip_code",
	'program_approved',
	CASE
		WHEN work_order."status" IN ('bids_received', 'responses_received') THEN 'responses_received'
		WHEN work_order."status" = 'assigned' THEN 'assigned'
		WHEN work_order."status" = 'in_progress' THEN 'in_progress'
		WHEN work_order."status" = 'completed' THEN 'completed'
		WHEN work_order."status" = 'cancelled' THEN 'cancelled'
		ELSE 'open'
	END,
	work_order."created_at",
	work_order."created_at",
	work_order."updated_at"
FROM "overflow_work_orders" work_order
INNER JOIN "repair_cases" repair_case ON repair_case."id" = work_order."repair_case_id"
INNER JOIN "repair_needs" repair_need ON repair_need."id" = work_order."repair_need_id"
INNER JOIN "homes" home ON home."id" = repair_case."home_id"
ON CONFLICT DO NOTHING;