CREATE TABLE "case_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_case_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"relationship" text,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"permission_acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_contacts" ADD CONSTRAINT "case_contacts_repair_case_id_repair_cases_id_fk" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_contacts_repair_case_type_unique" ON "case_contacts" USING btree ("repair_case_id","contact_type");