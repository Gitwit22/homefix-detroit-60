import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../server/db";
import { homes, repairCases, repairNeeds, residents } from "../../server/db/schema";

export const intakeSubmissionSchema = z.object({
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

function createCaseNumber(zipCode: string) {
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `HF-${zipCode}-${suffix}`;
}

export const submitIntake = createServerFn({ method: "POST" })
  .validator(intakeSubmissionSchema)
  .handler(async ({ data }) => {
    const residentResult = await db
      .insert(residents)
      .values({
        firstName: data.resident.firstName,
        lastName: data.resident.lastName,
        email: data.resident.email || null,
        phone: data.resident.phone || null,
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
        streetAddress: data.property.streetAddress,
        city: data.property.city,
        state: data.property.state,
        zipCode: data.property.zipCode,
        occupancyType: data.property.occupancyType,
        primaryResidence: data.property.primaryResidence,
        yearsAtProperty: data.property.yearsAtProperty ?? null,
        householdSize: data.household.householdSize ?? null,
        incomeRange: data.household.incomeRange ?? null,
        applicantAge: data.household.applicantAge ?? null,
        seniorHousehold: data.household.seniorHousehold,
        childrenInHousehold: data.household.childrenInHousehold,
        accessibilityNeeds: data.household.accessibilityNeeds,
      })
      .returning({ id: homes.id });

    const homeId = homeResult[0]?.id;
    if (!homeId) {
      throw new Error("Home could not be created");
    }

    const caseNumber = createCaseNumber(data.property.zipCode);

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
        category: data.repair.category,
        description: data.repair.description,
        startedWhen: data.repair.startedWhen ?? null,
        gettingWorse: data.repair.gettingWorse,
        safeToOccupy: data.repair.safeToOccupy,
        urgency: data.repair.urgency,
        status: "reported",
      })
      .returning({ id: repairNeeds.id });

    if (!repairNeedResult[0]?.id) {
      throw new Error("Repair need could not be created");
    }

    return {
      success: true,
      caseId: repairCaseId,
      caseNumber,
    };
  });
