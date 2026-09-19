import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  caseEvents,
  documents,
  homes,
  programMatches,
  programs,
  repairAssessments,
  repairCases,
  repairNeeds,
  residents,
} from "../db/schema.js";

export async function getCaseAggregate(caseId: string) {
  const caseRow = await db.select().from(repairCases).where(eq(repairCases.id, caseId)).limit(1);
  const foundCase = caseRow[0];
  if (!foundCase) {
    return null;
  }

  const homeRow = await db.select().from(homes).where(eq(homes.id, foundCase.homeId)).limit(1);
  const home = homeRow[0] ?? null;
  if (!home) {
    return null;
  }

  const residentRow = await db
    .select()
    .from(residents)
    .where(eq(residents.id, home.residentId))
    .limit(1);
  const resident = residentRow[0] ?? null;

  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  const repairNeedIds = needs.map((need) => need.id);

  const assessments =
    repairNeedIds.length > 0
      ? await db
          .select()
          .from(repairAssessments)
          .where(inArray(repairAssessments.repairNeedId, repairNeedIds))
      : [];

  const matchRows =
    repairNeedIds.length > 0
      ? await db
          .select({
            match: programMatches,
            program: programs,
          })
          .from(programMatches)
          .innerJoin(programs, eq(programs.id, programMatches.programId))
          .where(inArray(programMatches.repairNeedId, repairNeedIds))
      : [];

  const caseDocuments = await db.select().from(documents).where(eq(documents.repairCaseId, caseId));
  const events = await db.select().from(caseEvents).where(eq(caseEvents.repairCaseId, caseId));

  return {
    case: foundCase,
    resident,
    home,
    repairNeeds: needs,
    assessments,
    matches: matchRows.map(({ match, program }) => ({ ...match, program })),
    documents: caseDocuments,
    events,
  };
}

export async function getRepairNeedForCase(caseId: string, repairNeedId?: string) {
  if (repairNeedId) {
    const explicit = await db
      .select()
      .from(repairNeeds)
      .where(and(eq(repairNeeds.id, repairNeedId), eq(repairNeeds.repairCaseId, caseId)))
      .limit(1);
    if (explicit[0]) return explicit[0];
  }

  const recent = await db
    .select()
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId))
    .orderBy(desc(repairNeeds.createdAt))
    .limit(1);
  return recent[0] ?? null;
}
