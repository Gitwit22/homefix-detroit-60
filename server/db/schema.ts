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
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  applicationStatus: text("application_status").default("unknown").notNull(),
  applicationOpenDate: timestamp("application_open_date", { withTimezone: true }),
  applicationCloseDate: timestamp("application_close_date", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
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
