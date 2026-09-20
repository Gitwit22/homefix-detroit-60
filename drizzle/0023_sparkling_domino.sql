CREATE TABLE "inspection_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_request_id" uuid NOT NULL,
	"provider_organization_id" uuid,
	"provider_organization_name" text NOT NULL,
	"assigned_to_account_id" uuid,
	"assigned_worker_name" text NOT NULL,
	"assigned_worker_phone" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspection_request_id_inspection_requests_id_fk" FOREIGN KEY ("inspection_request_id") REFERENCES "public"."inspection_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_assigned_to_account_id_contractor_access_accounts_id_fk" FOREIGN KEY ("assigned_to_account_id") REFERENCES "public"."contractor_access_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_assignments_request_unique" ON "inspection_assignments" USING btree ("inspection_request_id");--> statement-breakpoint
INSERT INTO "inspection_requests" ("repair_case_id", "status")
SELECT DISTINCT "repair_cases"."id", 'availability_requested'
FROM "repair_cases"
INNER JOIN "repair_needs" ON "repair_needs"."repair_case_id" = "repair_cases"."id"
INNER JOIN "program_matches" ON "program_matches"."repair_need_id" = "repair_needs"."id"
WHERE NOT EXISTS (
	SELECT 1
	FROM "inspection_requests"
	WHERE "inspection_requests"."repair_case_id" = "repair_cases"."id"
);