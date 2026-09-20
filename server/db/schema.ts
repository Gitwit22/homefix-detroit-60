import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const residents = pgTable("residents", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const homes = pgTable("homes", {
  id: uuid("id").defaultRandom().primaryKey(),
  residentId: uuid("resident_id")
    .references(() => residents.id, { onDelete: "cascade" })
    .notNull(),
  streetAddress: text("street_address").notNull(),
  city: text("city").default("Detroit").notNull(),
  state: text("state").default("MI").notNull(),
  zipCode: text("zip_code").notNull(),
  occupancyType: text("occupancy_type").notNull(),
  primaryResidence: boolean("primary_residence").default(true).notNull(),
  yearsAtProperty: integer("years_at_property"),
  householdSize: integer("household_size"),
  incomeRange: text("income_range"),
  applicantAge: integer("applicant_age"),
  seniorHousehold: boolean("senior_household").default(false).notNull(),
  childrenInHousehold: boolean("children_in_household").default(false).notNull(),
  accessibilityNeeds: boolean("accessibility_needs").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairCases = pgTable("repair_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  homeId: uuid("home_id")
    .references(() => homes.id, { onDelete: "cascade" })
    .notNull(),
  caseNumber: text("case_number").unique().notNull(),
  demoScenario: text("demo_scenario"),
  status: text("status").default("assessment_started").notNull(),
  currentStep: text("current_step").default("intake").notNull(),
  nextAction: text("next_action"),
  coveragePercentage: integer("coverage_percentage").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairNeeds = pgTable("repair_needs", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  startedWhen: text("started_when"),
  gettingWorse: boolean("getting_worse").default(false).notNull(),
  safeToOccupy: boolean("safe_to_occupy").default(true).notNull(),
  urgency: text("urgency").default("unknown").notNull(),
  status: text("status").default("reported").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairPhotos = pgTable("repair_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .notNull(),
  imageUrl: text("image_url").notNull(),
  publicId: text("public_id").unique(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  bytes: integer("bytes"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairAssessments = pgTable("repair_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .notNull(),
  predictedCategory: text("predicted_category"),
  urgency: text("urgency"),
  summary: text("summary"),
  observations: jsonb("observations"),
  safetyFlags: jsonb("safety_flags"),
  followUpQuestions: jsonb("follow_up_questions"),
  confidence: numeric("confidence"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").unique(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  recordType: text("record_type").default("resident_program").notNull(),
  governmentLevel: text("government_level"),
  fundingSource: text("funding_source"),
  description: text("description"),
  sourceUrl: text("source_url"),
  applicationUrl: text("application_url"),
  phone: text("phone"),
  applicationStatus: text("application_status").default("unknown").notNull(),
  applicationOpenDate: timestamp("application_open_date", { withTimezone: true }),
  applicationCloseDate: timestamp("application_close_date", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  matchable: boolean("matchable").default(false).notNull(),
  ownerOccupiedRequired: boolean("owner_occupied_required").default(false).notNull(),
  rentersEligible: boolean("renters_eligible").default(false).notNull(),
  landlordsEligible: boolean("landlords_eligible").default(false).notNull(),
  minimumAge: integer("minimum_age"),
  childRequired: boolean("child_required").default(false).notNull(),
  disabilityRequired: boolean("disability_required").default(false).notNull(),
  pregnancyQualifier: boolean("pregnancy_qualifier").default(false).notNull(),
  incomeLimitType: text("income_limit_type"),
  maxAmi: integer("max_ami"),
  taxesCurrentRequired: boolean("taxes_current_required").default(false).notNull(),
  paymentPlanAccepted: boolean("payment_plan_accepted").default(false).notNull(),
  geographicRestriction: text("geographic_restriction"),
  disasterTieBackRequired: boolean("disaster_tie_back_required").default(false).notNull(),
  benefitType: text("benefit_type"),
  residentEntryPoint: text("resident_entry_point"),
  notes: text("notes"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  requiredDocuments: jsonb("required_documents").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const programRules = pgTable("program_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  ruleType: text("rule_type").notNull(),
  operator: text("operator").notNull(),
  value: jsonb("value").notNull(),
  required: boolean("required").default(true).notNull(),
});

export const programRepairTypes = pgTable("program_repair_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  repairType: text("repair_type").notNull(),
});

export const programMatches = pgTable("program_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .notNull(),
  programId: uuid("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  matchStatus: text("match_status").notNull(),
  approvalStatus: text("approval_status").default("pending").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  explanation: text("explanation"),
  missingRequirements: jsonb("missing_requirements"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url"),
  status: text("status").default("missing").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseEvents = pgTable("case_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const overflowWorkOrders = pgTable("overflow_work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  programId: uuid("program_id")
    .references(() => programs.id, { onDelete: "restrict" })
    .notNull(),
  workOrderNumber: text("work_order_number").unique().notNull(),
  scope: text("scope").notNull(),
  priority: text("priority").notNull(),
  status: text("status").default("open_for_bids").notNull(),
  synthetic: boolean("synthetic").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const overflowBids = pgTable("overflow_bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  workOrderId: uuid("work_order_id")
    .references(() => overflowWorkOrders.id, { onDelete: "cascade" })
    .notNull(),
  contractorName: text("contractor_name").notNull(),
  estimatedPriceCents: integer("estimated_price_cents").notNull(),
  estimatedDurationDays: integer("estimated_duration_days").notNull(),
  notes: text("notes").notNull(),
  status: text("status").default("submitted").notNull(),
  synthetic: boolean("synthetic").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
