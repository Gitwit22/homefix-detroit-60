CREATE TABLE "demo_control" (
	"id" text PRIMARY KEY NOT NULL,
	"baseline_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repair_cases" ADD COLUMN "provenance" text DEFAULT 'resident' NOT NULL;
--> statement-breakpoint
UPDATE "repair_cases"
SET "provenance" = 'demo_submission'
WHERE "demo_session_id" IS NOT NULL OR "demo_scenario" IS NOT NULL;
--> statement-breakpoint
UPDATE "repair_cases"
SET "provenance" = 'seeded_demo'
WHERE "id" IN (
	'84030000-0000-4000-8000-000000000001',
	'84030000-0000-4000-8000-000000000002',
	'84030000-0000-4000-8000-000000000003',
	'84030000-0000-4000-8000-000000000004',
	'84030000-0000-4000-8000-000000000005',
	'84030000-0000-4000-8000-000000000006'
);
--> statement-breakpoint
INSERT INTO "demo_control" ("id", "baseline_enabled")
VALUES ('partner', true)
ON CONFLICT ("id") DO NOTHING;