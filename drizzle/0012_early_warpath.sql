ALTER TABLE "inspections" ADD COLUMN "inspection_questions" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "inspections" AS "inspection"
SET "inspection_questions" = COALESCE((
	SELECT jsonb_agg(
		jsonb_build_object(
			'id', gen_random_uuid()::text,
			'repairNeedId', "assessment"."repair_need_id"::text,
			'question', "prompt"."question",
			'answer', NULL,
			'unableToVerify', false
		)
		ORDER BY "assessment"."created_at", "prompt"."ordinality"
	)
	FROM "repair_needs" AS "need"
	INNER JOIN "repair_assessments" AS "assessment"
		ON "assessment"."repair_need_id" = "need"."id"
	CROSS JOIN LATERAL jsonb_array_elements_text(
		CASE
			WHEN jsonb_typeof("assessment"."follow_up_questions") = 'array'
			THEN "assessment"."follow_up_questions"
			ELSE '[]'::jsonb
		END
	) WITH ORDINALITY AS "prompt"("question", "ordinality")
	WHERE "need"."repair_case_id" = "inspection"."repair_case_id"
		AND btrim("prompt"."question") <> ''
), '[]'::jsonb)
WHERE "inspection"."inspection_questions" = '[]'::jsonb;