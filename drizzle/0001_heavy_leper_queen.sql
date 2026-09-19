ALTER TABLE "repair_photos" ADD COLUMN "public_id" text;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "original_filename" text;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "bytes" integer;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD CONSTRAINT "repair_photos_public_id_unique" UNIQUE("public_id");