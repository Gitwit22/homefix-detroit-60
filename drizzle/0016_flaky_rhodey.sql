CREATE TABLE "inspection_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_request_id" uuid NOT NULL,
	"availability_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"confirmed_start" timestamp with time zone NOT NULL,
	"confirmed_end" timestamp with time zone NOT NULL,
	"provider_name" text NOT NULL,
	"provider_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_request_id" uuid NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"status" text DEFAULT 'availability_requested' NOT NULL,
	"case_snapshot" jsonb DEFAULT '{"needs":[]}'::jsonb NOT NULL,
	"inspection_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspection_findings" DROP CONSTRAINT "inspection_findings_inspection_id_inspections_id_fk";
--> statement-breakpoint
INSERT INTO "inspection_requests" (
	"id",
	"repair_case_id",
	"status",
	"case_snapshot",
	"inspection_questions",
	"created_at",
	"updated_at"
)
SELECT
	"inspection"."id",
	"inspection"."repair_case_id",
	"inspection"."status",
	jsonb_build_object(
		'needs',
		COALESCE((
			SELECT jsonb_agg(
				jsonb_build_object(
					'repairNeedId', "need"."id"::text,
					'description', "need"."description",
					'preliminaryCategory', COALESCE("assessment"."predicted_category", "need"."category"),
					'safetyFlags', COALESCE("assessment"."safety_flags", '[]'::jsonb),
					'trainingOpportunity', "assessment"."training_opportunity",
					'photos', COALESCE((
						SELECT jsonb_agg(
							jsonb_build_object(
								'id', "photo"."id"::text,
								'objectKey', "photo"."public_id"
							)
							ORDER BY "photo"."created_at"
						)
						FROM "repair_photos" AS "photo"
						WHERE "photo"."repair_need_id" = "need"."id"
					), '[]'::jsonb)
				)
				ORDER BY "need"."created_at"
			)
			FROM "repair_needs" AS "need"
			LEFT JOIN "repair_assessments" AS "assessment"
				ON "assessment"."repair_need_id" = "need"."id"
			WHERE "need"."repair_case_id" = "inspection"."repair_case_id"
		), '[]'::jsonb)
	),
	"inspection"."inspection_questions",
	"inspection"."created_at",
	"inspection"."updated_at"
FROM "inspections" AS "inspection";
--> statement-breakpoint
INSERT INTO "inspection_availability" (
	"inspection_request_id",
	"start",
	"end",
	"created_at",
	"updated_at"
)
SELECT
	"inspection"."id",
	("window"."value"->>'start')::timestamp with time zone,
	("window"."value"->>'end')::timestamp with time zone,
	"inspection"."created_at",
	"inspection"."updated_at"
FROM "inspections" AS "inspection"
CROSS JOIN LATERAL jsonb_array_elements("inspection"."availability_windows") AS "window"("value")
WHERE "window"."value" ? 'start'
	AND "window"."value" ? 'end';
--> statement-breakpoint
INSERT INTO "inspection_appointments" (
	"inspection_request_id",
	"availability_id",
	"status",
	"confirmed_start",
	"confirmed_end",
	"provider_name",
	"provider_phone",
	"created_at",
	"updated_at"
)
SELECT
	"inspection"."id",
	"availability"."id",
	CASE WHEN "inspection"."status" = 'completed' THEN 'completed' ELSE 'scheduled' END,
	"inspection"."confirmed_start",
	"inspection"."confirmed_end",
	COALESCE("inspection"."provider_name", 'Unassigned provider'),
	"inspection"."provider_phone",
	"inspection"."created_at",
	"inspection"."updated_at"
FROM "inspections" AS "inspection"
LEFT JOIN "inspection_availability" AS "availability"
	ON "availability"."inspection_request_id" = "inspection"."id"
	AND "availability"."start" = "inspection"."confirmed_start"
	AND "availability"."end" = "inspection"."confirmed_end"
WHERE "inspection"."confirmed_start" IS NOT NULL
	AND "inspection"."confirmed_end" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "inspection_findings" RENAME COLUMN "inspection_id" TO "inspection_request_id";--> statement-breakpoint
DROP INDEX "inspection_findings_inspection_repair_need_unique";--> statement-breakpoint
ALTER TABLE "inspections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "inspections";--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD COLUMN "training_suitability" text;--> statement-breakpoint
ALTER TABLE "inspection_appointments" ADD CONSTRAINT "inspection_appointments_inspection_request_id_inspection_requests_id_fk" FOREIGN KEY ("inspection_request_id") REFERENCES "public"."inspection_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_appointments" ADD CONSTRAINT "inspection_appointments_availability_id_inspection_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."inspection_availability"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_availability" ADD CONSTRAINT "inspection_availability_inspection_request_id_inspection_requests_id_fk" FOREIGN KEY ("inspection_request_id") REFERENCES "public"."inspection_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD CONSTRAINT "inspection_requests_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_appointments_request_unique" ON "inspection_appointments" USING btree ("inspection_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_availability_request_window_unique" ON "inspection_availability" USING btree ("inspection_request_id","start","end");--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_requests_repair_case_id_unique" ON "inspection_requests" USING btree ("repair_case_id");--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_request_id_inspection_requests_id_fk" FOREIGN KEY ("inspection_request_id") REFERENCES "public"."inspection_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_findings_request_repair_need_unique" ON "inspection_findings" USING btree ("inspection_request_id","repair_need_id");