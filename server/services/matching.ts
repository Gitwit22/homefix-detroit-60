import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  caseEvents,
  documents,
  homes,
  programMatches,
  programRepairTypes,
  programRules,
  programs,
  repairCases,
  repairNeeds,
} from "../db/schema.js";
import { evaluateProgramRules } from "./eligibility.js";
import { normalizeRepairCategory } from "../domain/repair.js";

function toDisplayStatus(status: string) {
  switch (status) {
    case "strong_match":
      return "Strong Match";
    case "potential_match":
      return "Potential Match";
    case "verification_needed":
      return "Verification Needed";
    default:
      return "Not Eligible";
  }
}

function buildExplanation(status: string, passed: string[], missing: string[]) {
  const prefix = toDisplayStatus(status);
  const passedLine = passed.length > 0 ? `✓ ${passed.join(" · ")}` : "";
  const missingLine = missing.length > 0 ? `Still needed: ${missing.join(", ")}` : "";
  return [prefix, passedLine, missingLine].filter(Boolean).join("\n");
}

export async function runMatchingForCase(caseId: string) {
  const caseRow = await db.select().from(repairCases).where(eq(repairCases.id, caseId)).limit(1);
  const foundCase = caseRow[0];
  if (!foundCase) {
    throw new Error("Case not found");
  }

  const homeRow = await db.select().from(homes).where(eq(homes.id, foundCase.homeId)).limit(1);
  const home = homeRow[0];
  if (!home) {
    throw new Error("Home not found");
  }

  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  if (needs.length === 0) {
    return [];
  }

  const activePrograms = await db
    .select()
    .from(programs)
    .where(and(eq(programs.active, true), eq(programs.matchable, true)));
  const programIds = activePrograms.map((program) => program.id);
  const allRules =
    programIds.length > 0
      ? await db.select().from(programRules).where(inArray(programRules.programId, programIds))
      : [];
  const allRepairTypes =
    programIds.length > 0
      ? await db
          .select()
          .from(programRepairTypes)
          .where(inArray(programRepairTypes.programId, programIds))
      : [];

  const createdMatches: Array<{ repairNeedId: string; matchStatus: string; programId: string }> =
    [];

  await db.delete(programMatches).where(
    inArray(
      programMatches.repairNeedId,
      needs.map((need) => need.id),
    ),
  );

  for (const need of needs) {
    const normalizedNeedCategory = normalizeRepairCategory(need.category);

    for (const program of activePrograms) {
      const supportedRepairs = allRepairTypes
        .filter((entry) => entry.programId === program.id)
        .map((entry) => normalizeRepairCategory(entry.repairType));

      if (supportedRepairs.length > 0 && !supportedRepairs.includes(normalizedNeedCategory)) {
        continue;
      }

      const rulesForProgram = allRules.filter((rule) => rule.programId === program.id);
      const evaluation = evaluateProgramRules({
        home,
        repairNeed: need,
        applicationStatus: program.applicationStatus,
        rules: rulesForProgram,
      });

      const passed = evaluation.evaluations
        .filter((result) => result.passed === true)
        .map((result) => result.reason.replace(/ passed$/, ""));
      const missing = evaluation.evaluations
        .filter((result) => result.passed !== true)
        .map((result) => result.reason);
      const explanation = buildExplanation(evaluation.status, passed, missing);

      if (evaluation.status === "not_eligible") {
        continue;
      }

      await db.insert(programMatches).values({
        repairNeedId: need.id,
        programId: program.id,
        matchStatus: evaluation.status,
        explanation,
        missingRequirements: missing,
      });

      createdMatches.push({
        repairNeedId: need.id,
        matchStatus: evaluation.status,
        programId: program.id,
      });
    }
  }

  const matchedProgramIds = new Set(createdMatches.map((match) => match.programId));
  const requiredDocumentTypes = new Set(
    activePrograms
      .filter((program) => matchedProgramIds.has(program.id))
      .flatMap((program) => program.requiredDocuments),
  );
  const existingDocuments = await db
    .select({ documentType: documents.documentType })
    .from(documents)
    .where(eq(documents.repairCaseId, caseId));
  const existingTypes = new Set(existingDocuments.map((document) => document.documentType));
  const missingDocuments = [...requiredDocumentTypes]
    .filter((documentType) => !existingTypes.has(documentType))
    .map((documentType) => ({ repairCaseId: caseId, documentType, status: "missing" }));
  if (missingDocuments.length > 0) {
    await db.insert(documents).values(missingDocuments);
  }

  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "program_matching_completed",
    title: "Program matching completed",
    description: `${createdMatches.length} potential program matches identified.`,
    metadata: { matches: createdMatches.length },
  });

  return createdMatches;
}
