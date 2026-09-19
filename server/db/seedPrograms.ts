import "dotenv/config";

import { inArray } from "drizzle-orm";

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
        description: program.description,
        sourceUrl: program.sourceUrl,
        applicationStatus: program.applicationStatus,
        active: true,
        lastVerifiedAt: new Date(program.lastVerifiedAt),
        requiredDocuments: program.requiredDocuments,
      })
      .onConflictDoUpdate({
        target: programs.id,
        set: {
          slug: program.slug,
          name: program.name,
          organization: program.organization,
          description: program.description,
          sourceUrl: program.sourceUrl,
          applicationStatus: program.applicationStatus,
          active: true,
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

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  seedPrograms()
    .then((result) => console.log(`Seeded ${result.programs} HomeFix programs.`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
