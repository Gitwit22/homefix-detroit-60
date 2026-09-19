import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { programRepairTypes, programRules, programs } from "../db/schema.js";

export async function getProgramDetail(identifier: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    identifier,
  );
  const rows = await db
    .select()
    .from(programs)
    .where(isUuid ? eq(programs.id, identifier) : eq(programs.slug, identifier))
    .limit(1);
  const program = rows[0];
  if (!program) return null;

  const [repairTypes, rules] = await Promise.all([
    db.select().from(programRepairTypes).where(eq(programRepairTypes.programId, program.id)),
    db.select().from(programRules).where(eq(programRules.programId, program.id)),
  ]);

  return {
    id: program.id,
    slug: program.slug,
    name: program.name,
    organization: program.organization,
    description: program.description,
    sourceUrl: program.sourceUrl,
    applicationStatus: program.applicationStatus,
    lastVerifiedAt: program.lastVerifiedAt,
    requiredDocuments: program.requiredDocuments,
    repairTypes: repairTypes.map((item) => item.repairType),
    rules: rules.map((rule) => ({
      ruleType: rule.ruleType,
      operator: rule.operator,
      value: rule.value,
      required: rule.required,
    })),
  };
}
