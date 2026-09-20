import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  homes,
  programMatches,
  programs,
  repairAssessments,
  repairCases,
  repairNeeds,
  residents,
} from "../db/schema.js";
import type {
  CaseStatus,
  CoverageStatus,
  MatchStatus,
  PartnerRepairFact,
  Priority,
} from "../domain/partnerAnalytics.js";
import { normalizeRepairCategory } from "../domain/repair.js";

const matchRank: Record<MatchStatus, number> = {
  strong_match: 0,
  potential_match: 1,
  verification_needed: 2,
  not_eligible: 3,
  no_match: 4,
};

function toPriority(value: string): Priority {
  if (value === "critical" || value === "high" || value === "low") return value;
  return "moderate";
}

function toMatchStatus(value: string | null): MatchStatus {
  if (
    value === "strong_match" ||
    value === "potential_match" ||
    value === "verification_needed" ||
    value === "not_eligible"
  ) {
    return value;
  }
  return "no_match";
}

function toCoverageStatus(status: MatchStatus): CoverageStatus {
  if (status === "strong_match" || status === "potential_match") return "potentially_covered";
  if (status === "verification_needed") return "verification_needed";
  return "funding_gap";
}

export function toPartnerCaseStatus(value: string): CaseStatus {
  if (value === "reported") return "reported";
  if (value === "screening") return "screening";
  if (value === "potential_programs") return "potential_programs";
  if (value === "inspection") return "inspection";
  if (value === "verified_scope") return "verified_scope";
  if (value === "documents") return "documents";
  if (value === "program_approval") return "program_approval";
  if (value === "repair_assignment") return "repair_assignment";
  if (value === "completion") return "completion";
  if (value === "completed") return "completed";
  if (value === "documents_needed") return "documents_needed";
  if (value === "referred") return "referred";
  if (value === "waitlisted") return "waitlisted";
  if (value === "repair_scheduled") return "repair_scheduled";
  if (value === "coverage_updated" || value === "intelligence_completed") return "program_review";
  return "assessment_complete";
}

type PartnerFactRow = {
  homeId: string;
  caseId: string;
  caseNumber: string;
  streetAddress: string;
  zipCode: string;
  caseStatus: string;
  createdAt: Date;
  repairNeedId: string;
  category: string;
  urgency: string;
  trainingOpportunity: Exclude<PartnerRepairFact["trainingOpportunity"], undefined>;
  matchStatus: string | null;
  programSlug: string | null;
};

export function mapPartnerFactRows(rows: PartnerFactRow[]): PartnerRepairFact[] {
  const grouped = new Map<string, PartnerFactRow[]>();
  for (const row of rows) {
    grouped.set(row.repairNeedId, [...(grouped.get(row.repairNeedId) ?? []), row]);
  }

  return [...grouped.values()].map((needRows) => {
    const first = needRows[0]!;
    const best = needRows
      .map((row) => ({ row, status: toMatchStatus(row.matchStatus) }))
      .sort((left, right) => matchRank[left.status] - matchRank[right.status])[0]!;
    const fact: PartnerRepairFact = {
      homeId: first.homeId,
      caseId: first.caseId,
      caseNumber: first.caseNumber,
      repairNeedId: first.repairNeedId,
      propertyLabel: first.streetAddress,
      zipCode: first.zipCode,
      repairType: normalizeRepairCategory(first.category),
      priority: toPriority(first.urgency),
      matchStatus: best.status,
      coverageStatus: toCoverageStatus(best.status),
      caseStatus: toPartnerCaseStatus(first.caseStatus),
      trainingOpportunity: first.trainingOpportunity,
      createdAt: first.createdAt.toISOString(),
      synthetic: false,
    };
    return best.row.programSlug ? { ...fact, programId: best.row.programSlug } : fact;
  });
}

export async function loadPartnerFactsFromDatabase(): Promise<PartnerRepairFact[]> {
  const rows = await db
    .select({
      homeId: homes.id,
      caseId: repairCases.id,
      caseNumber: repairCases.caseNumber,
      streetAddress: homes.streetAddress,
      zipCode: homes.zipCode,
      caseStatus: repairCases.status,
      createdAt: repairCases.createdAt,
      repairNeedId: repairNeeds.id,
      category: repairNeeds.category,
      urgency: repairNeeds.urgency,
      trainingOpportunity: repairAssessments.trainingOpportunity,
      matchStatus: programMatches.matchStatus,
      programSlug: programs.slug,
    })
    .from(repairNeeds)
    .innerJoin(repairCases, eq(repairCases.id, repairNeeds.repairCaseId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(residents, eq(residents.id, homes.residentId))
    .leftJoin(repairAssessments, eq(repairAssessments.repairNeedId, repairNeeds.id))
    .leftJoin(programMatches, eq(programMatches.repairNeedId, repairNeeds.id))
    .leftJoin(programs, eq(programs.id, programMatches.programId));

  return mapPartnerFactRows(rows);
}

export const listPersistedPartnerFacts = loadPartnerFactsFromDatabase;
