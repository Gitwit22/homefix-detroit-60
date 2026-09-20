ALTER TABLE "repair_needs" RENAME COLUMN "safe_to_occupy" TO "safety_status";--> statement-breakpoint
ALTER TABLE "repair_needs" ALTER COLUMN "safety_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "repair_needs" ALTER COLUMN "safety_status" TYPE text USING CASE WHEN "safety_status" THEN 'safe' ELSE 'unsafe' END;--> statement-breakpoint
ALTER TABLE "repair_needs" ALTER COLUMN "safety_status" SET DEFAULT 'unsure';