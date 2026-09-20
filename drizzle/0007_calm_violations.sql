DELETE FROM "program_matches"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "repair_need_id", "program_id"
			ORDER BY "created_at" DESC, "id" DESC
		) AS "duplicate_rank"
		FROM "program_matches"
	) AS "ranked_matches"
	WHERE "duplicate_rank" > 1
);--> statement-breakpoint
DELETE FROM "repair_assessments"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "repair_need_id"
			ORDER BY "created_at" DESC, "id" DESC
		) AS "duplicate_rank"
		FROM "repair_assessments"
	) AS "ranked_assessments"
	WHERE "duplicate_rank" > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "program_matches_repair_need_program_unique" ON "program_matches" USING btree ("repair_need_id","program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_assessments_repair_need_id_unique" ON "repair_assessments" USING btree ("repair_need_id");