ALTER TABLE "documents" ADD COLUMN "object_key" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "original_filename" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "bytes" integer;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_object_key_unique" UNIQUE("object_key");