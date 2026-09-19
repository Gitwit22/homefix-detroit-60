import { z } from "zod";
import { db } from "../db/index.js";
import { homes, repairCases, repairNeeds, residents } from "../db/schema.js";
import { normalizeRepairCategory } from "../domain/repair.js";

export const intakeSchema = z.object({
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
  repair: z.object({
    category: z.string().min(1),
    description: z.string().min(1),
    startedWhen: z.string().optional(),
    gettingWorse: z.boolean().default(false),
    safeToOccupy: z.boolean().default(true),
    urgency: z.string().default("unknown"),
  }),
});

export function createCaseNumber(zipCode: string) {
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `HF-${zipCode}-${suffix}`;
}

export async function createIntakeCase(payload: z.infer<typeof intakeSchema>) {
  const residentResult = await db
    .insert(residents)
    .values({
      firstName: payload.resident.firstName,
      lastName: payload.resident.lastName,
      email: payload.resident.email || null,
      phone: payload.resident.phone || null,
    })
    .returning({ id: residents.id });

  const residentId = residentResult[0]?.id;
  if (!residentId) {
    throw new Error("Resident could not be created");
  }

  const homeResult = await db
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
  if (!homeId) {
    throw new Error("Home could not be created");
  }

  const caseNumber = createCaseNumber(payload.property.zipCode);

  const repairCaseResult = await db
    .insert(repairCases)
    .values({
      homeId,
      caseNumber,
      status: "assessment_started",
      currentStep: "intake",
      nextAction: "Preliminary review pending",
      coveragePercentage: 0,
    })
    .returning({ id: repairCases.id });

  const repairCaseId = repairCaseResult[0]?.id;
  if (!repairCaseId) {
    throw new Error("Repair case could not be created");
  }

  const repairNeedResult = await db
    .insert(repairNeeds)
    .values({
      repairCaseId,
      category: normalizeRepairCategory(payload.repair.category),
      description: payload.repair.description,
      startedWhen: payload.repair.startedWhen ?? null,
      gettingWorse: payload.repair.gettingWorse,
      safeToOccupy: payload.repair.safeToOccupy,
      urgency: payload.repair.urgency,
      status: "reported",
    })
    .returning({ id: repairNeeds.id });

  const repairNeedId = repairNeedResult[0]?.id;
  if (!repairNeedId) {
    throw new Error("Repair need could not be created");
  }

  return {
    success: true,
    caseId: repairCaseId,
    repairNeedId,
    caseNumber,
  };
}
