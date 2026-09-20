import { z } from "zod";
import { db } from "../db/index.js";
import { homes, repairCases, repairNeeds, residents } from "../db/schema.js";
import { DENISE_DEMO_SCENARIO } from "../demo/deniseScenario.js";
import { normalizeRepairCategory } from "../domain/repair.js";

export const intakeSchema = z.object({
  demoScenario: z.literal(DENISE_DEMO_SCENARIO).optional(),
  resident: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
  }),
  property: z.object({
    streetAddress: z.string().min(1),
    city: z.string().default("Detroit"),
    state: z.string().default("MI"),
    zipCode: z.string().min(5),
    occupancyType: z.enum(["owner", "renter"]),
    primaryResidence: z.boolean().default(true),
    yearsAtProperty: z.number().int().min(0).optional(),
  }),
  household: z.object({
    householdSize: z.number().int().min(1).optional(),
    incomeRange: z.string().optional(),
    applicantAge: z.number().int().min(0).optional(),
    seniorHousehold: z.boolean().default(false),
    childrenInHousehold: z.boolean().default(false),
    accessibilityNeeds: z.boolean().default(false),
  }),
  repairs: z
    .array(
      z.object({
        clientId: z.string().min(1),
        category: z.string().min(1),
        description: z.string().min(1),
        startedWhen: z.string().optional(),
        gettingWorse: z.boolean().default(false),
        safetyStatus: z.enum(["safe", "unsafe", "unsure"]).default("unsure"),
        urgency: z.string().default("unknown"),
      }),
    )
    .min(1)
    .max(8),
});

export function createCaseNumber(zipCode: string) {
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `HF-${zipCode}-${suffix}`;
}

function isCaseNumberConflict(error: unknown) {
  if (!(error instanceof Error)) return false;
  const databaseError = error as Error & { code?: string; constraint?: string };
  return (
    databaseError.code === "23505" &&
    (databaseError.constraint === "repair_cases_case_number_unique" ||
      databaseError.message.includes("case_number"))
  );
}

export async function createIntakeCase(
  payload: z.infer<typeof intakeSchema>,
  options: { demoSessionId?: string } = {},
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async (transaction) => {
        const residentResult = await transaction
          .insert(residents)
          .values({
            firstName: payload.resident.firstName,
            lastName: payload.resident.lastName,
            email: payload.resident.email || null,
            phone: payload.resident.phone || null,
          })
          .returning({ id: residents.id });

        const residentId = residentResult[0]?.id;
        if (!residentId) throw new Error("Resident could not be created");

        const homeResult = await transaction
          .insert(homes)
          .values({
            residentId,
            streetAddress: payload.property.streetAddress,
            city: payload.property.city,
            state: payload.property.state,
            zipCode: payload.property.zipCode,
            occupancyType: payload.property.occupancyType,
            primaryResidence: payload.property.primaryResidence,
            yearsAtProperty: payload.property.yearsAtProperty ?? null,
            householdSize: payload.household.householdSize ?? null,
            incomeRange: payload.household.incomeRange ?? null,
            applicantAge: payload.household.applicantAge ?? null,
            seniorHousehold: payload.household.seniorHousehold,
            childrenInHousehold: payload.household.childrenInHousehold,
            accessibilityNeeds: payload.household.accessibilityNeeds,
          })
          .returning({ id: homes.id });

        const homeId = homeResult[0]?.id;
        if (!homeId) throw new Error("Home could not be created");

        const caseNumber = createCaseNumber(payload.property.zipCode);
        const repairCaseResult = await transaction
          .insert(repairCases)
          .values({
            homeId,
            caseNumber,
            demoScenario: payload.demoScenario ?? null,
            demoSessionId: options.demoSessionId ?? null,
            status: "reported",
            currentStep: "reported",
            nextAction: "Check the report against current program requirements.",
            coveragePercentage: 0,
          })
          .returning({ id: repairCases.id });

        const repairCaseId = repairCaseResult[0]?.id;
        if (!repairCaseId) throw new Error("Repair case could not be created");

        const repairNeedResult = await transaction
          .insert(repairNeeds)
          .values(
            payload.repairs.map((repair) => ({
              repairCaseId,
              repairRole: "PRIMARY" as const,
              category: normalizeRepairCategory(repair.category),
              description: repair.description,
              startedWhen: repair.startedWhen ?? null,
              gettingWorse: repair.gettingWorse,
              safetyStatus: repair.safetyStatus,
              urgency: repair.urgency,
              status: "reported",
            })),
          )
          .returning({ id: repairNeeds.id });

        const repairNeedIds = repairNeedResult.map((repairNeed) => repairNeed.id);
        const repairNeedId = repairNeedIds[0];
        if (!repairNeedId) throw new Error("Repair need could not be created");

        const repairs = payload.repairs.map((repair, index) => ({
          clientId: repair.clientId,
          repairNeedId: repairNeedIds[index]!,
        }));

        return {
          success: true as const,
          caseId: repairCaseId,
          repairNeedId,
          repairs,
          caseNumber,
        };
      });
    } catch (error) {
      if (attempt < 2 && isCaseNumberConflict(error)) continue;
      throw error;
    }
  }

  throw new Error("Case number could not be generated");
}
