import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  opportunityAssignmentStatuses,
  opportunityResponseStatuses,
  opportunityResponseTypes,
  opportunityStatuses,
  opportunityTypes,
} from "../domain/opportunity.js";
import { repairRoles } from "../domain/repair.js";
import type { TrainingOpportunity } from "../validation/triage.js";

export const residents = pgTable("residents", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const demoSessions = pgTable("demo_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  normalizedName: text("normalized_name").unique().notNull(),
  pinHash: text("pin_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contractorAccessAccounts = pgTable("contractor_access_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  normalizedName: text("normalized_name").unique().notNull(),
  pinHash: text("pin_hash").notNull(),
  contractorComplianceConfirmed: boolean("contractor_compliance_confirmed")
    .default(false)
    .notNull(),
  contractorComplianceConfirmedAt: timestamp("contractor_compliance_confirmed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const demoControl = pgTable("demo_control", {
  id: text("id").primaryKey(),
  baselineEnabled: boolean("baseline_enabled").default(true).notNull(),
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
  demoSessionId: uuid("demo_session_id").references(() => demoSessions.id, {
    onDelete: "set null",
  }),
  provenance: text("provenance").default("resident").notNull(),
  status: text("status").default("assessment_started").notNull(),
  currentStep: text("current_step").default("intake").notNull(),
  nextAction: text("next_action"),
  coveragePercentage: integer("coverage_percentage").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseContacts = pgTable(
  "case_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repairCaseId: uuid("repair_case_id")
      .references(() => repairCases.id, { onDelete: "cascade" })
      .notNull(),
    contactType: text("contact_type", { enum: ["assistant"] }).notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    relationship: text("relationship"),
    isPrimaryContact: boolean("is_primary_contact").default(false).notNull(),
    permissionAcknowledgedAt: timestamp("permission_acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("case_contacts_repair_case_type_unique").on(table.repairCaseId, table.contactType),
  ],
);

export const repairNeeds = pgTable("repair_needs", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  repairRole: text("repair_role", { enum: repairRoles }).default("PRIMARY").notNull(),
  parentRepairNeedId: uuid("parent_repair_need_id").references((): AnyPgColumn => repairNeeds.id, {
    onDelete: "cascade",
  }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  startedWhen: text("started_when"),
  gettingWorse: boolean("getting_worse").default(false).notNull(),
  safetyStatus: text("safety_status", { enum: ["safe", "unsafe", "unsure"] })
    .default("unsure")
    .notNull(),
  urgency: text("urgency").default("unknown").notNull(),
  status: text("status").default("reported").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairPhotos = pgTable("repair_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .notNull(),
  evidenceStage: text("evidence_stage").default("resident_report").notNull(),
  imageUrl: text("image_url").notNull(),
  publicId: text("public_id").unique(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  bytes: integer("bytes"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairAssessments = pgTable(
  "repair_assessments",
  {
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
    trainingOpportunity: jsonb("training_opportunity").$type<TrainingOpportunity>(),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("repair_assessments_repair_need_id_unique").on(table.repairNeedId)],
);

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

export const programMatches = pgTable(
  "program_matches",
  {
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
    screeningResults: jsonb("screening_results")
      .$type<
        Array<{ ruleType: string; required: boolean; passed: boolean | null; reason: string }>
      >()
      .default([])
      .notNull(),
    screenedAt: timestamp("screened_at", { withTimezone: true }),
    explanation: text("explanation"),
    missingRequirements: jsonb("missing_requirements"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("program_matches_repair_need_program_unique").on(
      table.repairNeedId,
      table.programId,
    ),
  ],
);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url"),
  objectKey: text("object_key").unique(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  bytes: integer("bytes"),
  status: text("status").default("missing").notNull(),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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

export type InspectionQuestion = {
  id: string;
  repairNeedId: string;
  question: string;
  answer: string | null;
  unableToVerify: boolean;
};

export type InspectionCaseSnapshot = {
  needs: Array<{
    repairNeedId: string;
    description: string;
    preliminaryCategory: string;
    safetyFlags: string[];
    trainingOpportunity: TrainingOpportunity | null;
    photos: Array<{ id: string; objectKey: string | null }>;
  }>;
};

export const inspectionRequests = pgTable(
  "inspection_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repairCaseId: uuid("repair_case_id")
      .references(() => repairCases.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").default("availability_requested").notNull(),
    caseSnapshot: jsonb("case_snapshot")
      .$type<InspectionCaseSnapshot>()
      .default({ needs: [] })
      .notNull(),
    inspectionQuestions: jsonb("inspection_questions")
      .$type<InspectionQuestion[]>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("inspection_requests_repair_case_id_unique").on(table.repairCaseId)],
);

export const inspectionAvailability = pgTable(
  "inspection_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionRequestId: uuid("inspection_request_id")
      .references(() => inspectionRequests.id, { onDelete: "cascade" })
      .notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("inspection_availability_request_window_unique").on(
      table.inspectionRequestId,
      table.start,
      table.end,
    ),
  ],
);

export const inspectionAppointments = pgTable(
  "inspection_appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionRequestId: uuid("inspection_request_id")
      .references(() => inspectionRequests.id, { onDelete: "cascade" })
      .notNull(),
    availabilityId: uuid("availability_id").references(() => inspectionAvailability.id, {
      onDelete: "restrict",
    }),
    status: text("status").default("scheduled").notNull(),
    confirmedStart: timestamp("confirmed_start", { withTimezone: true }).notNull(),
    confirmedEnd: timestamp("confirmed_end", { withTimezone: true }).notNull(),
    providerName: text("provider_name").notNull(),
    providerPhone: text("provider_phone"),
    confirmedByContractorAccountId: uuid("confirmed_by_contractor_account_id").references(
      () => contractorAccessAccounts.id,
      { onDelete: "set null" },
    ),
    confirmedByDisplayName: text("confirmed_by_display_name"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("inspection_appointments_request_unique").on(table.inspectionRequestId)],
);

export const inspectionFindings = pgTable(
  "inspection_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionRequestId: uuid("inspection_request_id")
      .references(() => inspectionRequests.id, { onDelete: "cascade" })
      .notNull(),
    repairNeedId: uuid("repair_need_id")
      .references(() => repairNeeds.id, { onDelete: "cascade" })
      .notNull(),
    confirmedCategory: text("confirmed_category").notNull(),
    urgency: text("urgency").notNull(),
    condition: text("condition").notNull(),
    notes: text("notes"),
    verifiedScope: text("verified_scope").notNull(),
    estimatedCostCents: integer("estimated_cost_cents"),
    trainingSuitability: text("training_suitability"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("inspection_findings_request_repair_need_unique").on(
      table.inspectionRequestId,
      table.repairNeedId,
    ),
  ],
);

export const workOrders = pgTable("work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairCaseId: uuid("repair_case_id")
    .references(() => repairCases.id, { onDelete: "cascade" })
    .notNull(),
  repairNeedId: uuid("repair_need_id")
    .references(() => repairNeeds.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  programId: uuid("program_id")
    .references(() => programs.id)
    .notNull(),
  workOrderNumber: text("work_order_number").unique().notNull(),
  repairType: text("repair_type").notNull(),
  scope: text("scope").notNull(),
  priority: text("priority").notNull(),
  fundingStatus: text("funding_status").default("program_approved").notNull(),
  capacityStatus: text("capacity_status").default("overflow").notNull(),
  status: text("status").default("open").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionNotes: text("completion_notes"),
  verificationStatus: text("verification_status").default("pending").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  isSynthetic: boolean("is_synthetic").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bids = pgTable(
  "bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workOrderId: uuid("work_order_id")
      .references(() => workOrders.id, { onDelete: "cascade" })
      .notNull(),
    contractorName: text("contractor_name").notNull(),
    companyName: text("company_name").notNull(),
    estimatedPriceCents: integer("estimated_price_cents").notNull(),
    estimatedDurationDays: integer("estimated_duration_days").notNull(),
    notes: text("notes"),
    status: text("status").default("submitted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("bids_work_order_id_created_at_idx").on(table.workOrderId, table.createdAt)],
);

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

export const userIdentities = pgTable("user_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerOrganizations = pgTable("provider_organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrganizationId: text("clerk_organization_id").unique().notNull(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "suspended"],
  })
    .default("pending")
    .notNull(),
  performsInspections: boolean("performs_inspections").default(false).notNull(),
  performsRepairs: boolean("performs_repairs").default(false).notNull(),
  supervisesTraining: boolean("supervises_training").default(false).notNull(),
  repairSpecialties: jsonb("repair_specialties").$type<string[]>().default([]).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerMemberships = pgTable(
  "provider_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerOrganizationId: uuid("provider_organization_id")
      .references(() => providerOrganizations.id, { onDelete: "cascade" })
      .notNull(),
    userIdentityId: uuid("user_identity_id")
      .references(() => userIdentities.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role", { enum: ["owner", "administrator", "member"] })
      .default("member")
      .notNull(),
    status: text("status", { enum: ["active", "suspended", "removed"] })
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("provider_memberships_organization_user_unique").on(
      table.providerOrganizationId,
      table.userIdentityId,
    ),
  ],
);

export const partnerMemberships = pgTable(
  "partner_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userIdentityId: uuid("user_identity_id")
      .references(() => userIdentities.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role", { enum: ["administrator", "case_manager", "reviewer"] }).notNull(),
    status: text("status", { enum: ["active", "suspended", "removed"] })
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("partner_memberships_user_unique").on(table.userIdentityId)],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicNumber: text("public_number").unique().notNull(),
    repairCaseId: uuid("repair_case_id")
      .references(() => repairCases.id, { onDelete: "cascade" })
      .notNull(),
    repairNeedId: uuid("repair_need_id")
      .references(() => repairNeeds.id, { onDelete: "cascade" })
      .notNull(),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
    type: text("type", { enum: opportunityTypes }).notNull(),
    repairCategory: text("repair_category").notNull(),
    priority: text("priority").notNull(),
    publicScope: text("public_scope").notNull(),
    zipCode: text("zip_code").notNull(),
    fundingStatus: text("funding_status"),
    trainingOpportunityStatus: text("training_opportunity_status"),
    potentialSkills: jsonb("potential_skills").$type<string[]>().default([]).notNull(),
    status: text("status", { enum: opportunityStatuses }).default("open").notNull(),
    publishedByUserId: uuid("published_by_user_id").references(() => userIdentities.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("opportunities_public_list_idx").on(table.status, table.type, table.createdAt),
    index("opportunities_zip_category_idx").on(table.zipCode, table.repairCategory),
    uniqueIndex("opportunities_active_need_type_unique")
      .on(table.repairNeedId, table.type)
      .where(sql`${table.status} not in ('completed', 'cancelled')`),
  ],
);

export const opportunityResponses = pgTable(
  "opportunity_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .references(() => opportunities.id, { onDelete: "cascade" })
      .notNull(),
    providerOrganizationId: uuid("provider_organization_id")
      .references(() => providerOrganizations.id, { onDelete: "restrict" })
      .notNull(),
    submittedByUserId: uuid("submitted_by_user_id")
      .references(() => userIdentities.id, { onDelete: "restrict" })
      .notNull(),
    responseType: text("response_type", { enum: opportunityResponseTypes }).notNull(),
    estimatedPriceCents: integer("estimated_price_cents"),
    estimatedDurationDays: integer("estimated_duration_days"),
    notes: text("notes"),
    status: text("status", { enum: opportunityResponseStatuses }).default("submitted").notNull(),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => userIdentities.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_responses_opportunity_provider_unique").on(
      table.opportunityId,
      table.providerOrganizationId,
    ),
    index("opportunity_responses_review_queue_idx").on(table.opportunityId, table.status),
  ],
);

export const opportunityAssignments = pgTable(
  "opportunity_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .references(() => opportunities.id, { onDelete: "cascade" })
      .notNull(),
    opportunityResponseId: uuid("opportunity_response_id").references(
      () => opportunityResponses.id,
      { onDelete: "set null" },
    ),
    providerOrganizationId: uuid("provider_organization_id")
      .references(() => providerOrganizations.id, { onDelete: "restrict" })
      .notNull(),
    assignedUserId: uuid("assigned_user_id")
      .references(() => userIdentities.id, { onDelete: "restrict" })
      .notNull(),
    assignedByUserId: uuid("assigned_by_user_id")
      .references(() => userIdentities.id, { onDelete: "restrict" })
      .notNull(),
    status: text("status", { enum: opportunityAssignmentStatuses }).default("active").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_assignments_active_opportunity_unique")
      .on(table.opportunityId)
      .where(sql`${table.status} = 'active'`),
    index("opportunity_assignments_provider_status_idx").on(
      table.providerOrganizationId,
      table.status,
    ),
  ],
);

export const opportunityPhotoReleases = pgTable(
  "opportunity_photo_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .references(() => opportunities.id, { onDelete: "cascade" })
      .notNull(),
    repairPhotoId: uuid("repair_photo_id")
      .references(() => repairPhotos.id, { onDelete: "cascade" })
      .notNull(),
    approvedByUserId: uuid("approved_by_user_id")
      .references(() => userIdentities.id, { onDelete: "restrict" })
      .notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_photo_releases_opportunity_photo_unique").on(
      table.opportunityId,
      table.repairPhotoId,
    ),
  ],
);
