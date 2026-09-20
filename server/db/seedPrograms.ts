import "dotenv/config";

import { inArray } from "drizzle-orm";
import { pathToFileURL } from "node:url";

import { detroitProgramCatalog } from "../data/detroitPrograms.js";
import { db } from "./index.js";
import { programRepairTypes, programRules, programs } from "./schema.js";

export async function seedPrograms() {
  const programIds = detroitProgramCatalog.map((program) => program.id);

  for (const program of detroitProgramCatalog) {
    await db
      .insert(programs)
      .values({
        id: program.id,
        slug: program.slug,
        name: program.name,
        organization: program.organization,
        recordType: program.recordType,
        governmentLevel: program.governmentLevel,
        fundingSource: program.fundingSource,
        description: program.description,
        sourceUrl: program.sourceUrl,
        applicationUrl: program.applicationUrl,
        phone: program.phone,
        applicationStatus: program.applicationStatus,
        applicationOpenDate: program.applicationOpenDate
          ? new Date(program.applicationOpenDate)
          : null,
        applicationCloseDate: program.applicationCloseDate
          ? new Date(program.applicationCloseDate)
          : null,
        active: program.active,
        matchable: program.matchable,
        ownerOccupiedRequired: program.ownerOccupiedRequired,
        rentersEligible: program.rentersEligible,
        landlordsEligible: program.landlordsEligible,
        minimumAge: program.minimumAge,
        childRequired: program.childRequired,
        disabilityRequired: program.disabilityRequired,
        pregnancyQualifier: program.pregnancyQualifier,
        incomeLimitType: program.incomeLimitType,
        maxAmi: program.maxAmi,
        taxesCurrentRequired: program.taxesCurrentRequired,
        paymentPlanAccepted: program.paymentPlanAccepted,
        geographicRestriction: program.geographicRestriction,
        disasterTieBackRequired: program.disasterTieBackRequired,
        benefitType: program.benefitType,
        residentEntryPoint: program.residentEntryPoint,
        notes: program.notes,
        lastVerifiedAt: new Date(program.lastVerifiedAt),
        requiredDocuments: program.requiredDocuments,
      })
      .onConflictDoUpdate({
        target: programs.id,
        set: {
          slug: program.slug,
          name: program.name,
          organization: program.organization,
          recordType: program.recordType,
          governmentLevel: program.governmentLevel,
          fundingSource: program.fundingSource,
          description: program.description,
          sourceUrl: program.sourceUrl,
          applicationUrl: program.applicationUrl,
          phone: program.phone,
          applicationStatus: program.applicationStatus,
          applicationOpenDate: program.applicationOpenDate
            ? new Date(program.applicationOpenDate)
            : null,
          applicationCloseDate: program.applicationCloseDate
            ? new Date(program.applicationCloseDate)
            : null,
          active: program.active,
          matchable: program.matchable,
          ownerOccupiedRequired: program.ownerOccupiedRequired,
          rentersEligible: program.rentersEligible,
          landlordsEligible: program.landlordsEligible,
          minimumAge: program.minimumAge,
          childRequired: program.childRequired,
          disabilityRequired: program.disabilityRequired,
          pregnancyQualifier: program.pregnancyQualifier,
          incomeLimitType: program.incomeLimitType,
          maxAmi: program.maxAmi,
          taxesCurrentRequired: program.taxesCurrentRequired,
          paymentPlanAccepted: program.paymentPlanAccepted,
          geographicRestriction: program.geographicRestriction,
          disasterTieBackRequired: program.disasterTieBackRequired,
          benefitType: program.benefitType,
          residentEntryPoint: program.residentEntryPoint,
          notes: program.notes,
          lastVerifiedAt: new Date(program.lastVerifiedAt),
          requiredDocuments: program.requiredDocuments,
        },
      });
  }

  await db.delete(programRules).where(inArray(programRules.programId, programIds));
  await db.delete(programRepairTypes).where(inArray(programRepairTypes.programId, programIds));

  await db
    .insert(programRules)
    .values(
      detroitProgramCatalog.flatMap((program) =>
        program.rules.map((rule) => ({ programId: program.id, ...rule })),
      ),
    );
  await db
    .insert(programRepairTypes)
    .values(
      detroitProgramCatalog.flatMap((program) =>
        program.repairTypes.map((repairType) => ({ programId: program.id, repairType })),
      ),
    );

  return { programs: detroitProgramCatalog.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedPrograms()
    .then((result) => console.log(`Seeded ${result.programs} HomeFix programs.`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
