import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  caseContacts,
  caseEvents,
  documents,
  homes,
  inspectionFindings,
  programMatches,
  programs,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
  residents,
  workOrders,
} from "../db/schema.js";
import { resolvePrimaryCaseContact } from "../domain/caseContact.js";
import { getCaseLifecycle } from "./lifecycle.js";
import { getInspectionState } from "./inspection.js";
import { presentDocument } from "./documents.js";
import { signedPhotoUrl } from "./photos.js";

async function displayPhotoUrl(photo: { publicId: string | null; imageUrl: string }) {
  if (!photo.publicId || !photo.imageUrl.startsWith("r2://")) return photo.imageUrl;
  try {
    return await signedPhotoUrl(photo.publicId);
  } catch (error) {
    console.error("Unable to sign repair photo URL", error);
    return photo.imageUrl;
  }
}

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
  const contacts = await db
    .select()
    .from(caseContacts)
    .where(eq(caseContacts.repairCaseId, caseId));
  const assistant = contacts.find((contact) => contact.contactType === "assistant") ?? null;
  const primaryContact = resident
    ? resolvePrimaryCaseContact(resident, assistant)
    : null;

  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  const repairNeedIds = needs.map((need) => need.id);

  const assessments =
    repairNeedIds.length > 0
      ? await db
          .select()
          .from(repairAssessments)
          .where(inArray(repairAssessments.repairNeedId, repairNeedIds))
      : [];

  const photos =
    repairNeedIds.length > 0
      ? await db
          .select()
          .from(repairPhotos)
          .where(inArray(repairPhotos.repairNeedId, repairNeedIds))
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
  const inspection = await getInspectionState(caseId);
  const findings = inspection
    ? await db
        .select()
        .from(inspectionFindings)
        .where(eq(inspectionFindings.inspectionRequestId, inspection.id))
    : [];
  const caseWorkOrders = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.repairCaseId, caseId));
  const lifecycle = await getCaseLifecycle(caseId);

  return {
    case: foundCase,
    resident,
    contacts,
    primaryContact,
    home,
    repairNeeds: needs,
    photos: await Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        repairNeedId: photo.repairNeedId,
        evidenceStage: photo.evidenceStage,
        imageUrl: await displayPhotoUrl(photo),
        originalFilename: photo.originalFilename,
        width: photo.width,
        height: photo.height,
      })),
    ),
    assessments,
    matches: matchRows.map(({ match, program }) => ({ ...match, program })),
    documents: await Promise.all(caseDocuments.map(presentDocument)),
    events,
    inspection,
    inspectionFindings: findings.map(({ inspectionRequestId, ...finding }) => ({
      ...finding,
      inspectionId: inspectionRequestId,
    })),
    workOrders: caseWorkOrders,
    lifecycle,
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
