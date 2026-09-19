import { and, eq, inArray } from "drizzle-orm";
import { repairCategoryLabels, type RepairCategory } from "../domain/repair.js";
import { db } from "../db/index.js";
import {
  bids,
  homes,
  programMatches,
  programs,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
  residents,
  workOrders,
} from "../db/schema.js";
import { seedPrograms } from "../db/seedPrograms.js";

export type OverflowDemoBidSeed = {
  id: string;
  contractorName: string;
  companyName: string;
  estimatedPriceCents: number;
  estimatedDurationDays: number;
  notes?: string;
  createdAt: string;
};

type OverflowDemoCaseSeed = {
  residentId: string;
  homeId: string;
  caseId: string;
  repairNeedId: string;
  assessmentId: string;
  matchId: string;
  photoIds: string[];
  caseNumber: string;
  residentFirstName: string;
  residentLastName: string;
  streetAddress: string;
  zipCode: string;
  occupancyType: "owner" | "renter";
  householdSize: number;
  incomeRange: string;
  applicantAge: number;
  seniorHousehold: boolean;
  childrenInHousehold: boolean;
  accessibilityNeeds: boolean;
  repairCategory: RepairCategory;
  repairDescription: string;
  assessmentSummary: string;
  urgency: "moderate" | "high" | "critical";
  startedWhen: string;
  programSlug: string;
  createdAt: string;
  workOrderId?: string;
  workOrderNumber?: string;
  workOrderCreatedAt?: string;
  bids?: OverflowDemoBidSeed[];
};

const createdAt = "2026-09-19T12:00:00.000Z";

export const overflowDemoCases: OverflowDemoCaseSeed[] = [
  {
    residentId: "84010000-0000-4000-8000-000000000001",
    homeId: "84020000-0000-4000-8000-000000000001",
    caseId: "84030000-0000-4000-8000-000000000001",
    repairNeedId: "84040000-0000-4000-8000-000000000001",
    assessmentId: "84050000-0000-4000-8000-000000000001",
    matchId: "84060000-0000-4000-8000-000000000001",
    photoIds: ["84070000-0000-4000-8000-000000000001", "84070000-0000-4000-8000-000000000002"],
    caseNumber: "HF-313-0842",
    residentFirstName: "Denise",
    residentLastName: "Carter",
    streetAddress: "123 Main Street",
    zipCode: "48205",
    occupancyType: "owner",
    householdSize: 3,
    incomeRange: "$41,000-$60,000",
    applicantAge: 68,
    seniorHousehold: true,
    childrenInHousehold: false,
    accessibilityNeeds: false,
    repairCategory: "roof_water_intrusion",
    repairDescription:
      "Water intrusion affecting the upstairs bedroom ceiling during rainfall. Paint is bubbling and the drywall feels damp after storms.",
    assessmentSummary:
      "Possible roof or exterior envelope water intrusion affecting the upstairs bedroom ceiling.",
    urgency: "high",
    startedWhen: "Two months ago",
    programSlug: "critical-home-repair",
    createdAt,
  },
  {
    residentId: "84010000-0000-4000-8000-000000000002",
    homeId: "84020000-0000-4000-8000-000000000002",
    caseId: "84030000-0000-4000-8000-000000000002",
    repairNeedId: "84040000-0000-4000-8000-000000000002",
    assessmentId: "84050000-0000-4000-8000-000000000002",
    matchId: "84060000-0000-4000-8000-000000000002",
    photoIds: ["84070000-0000-4000-8000-000000000003"],
    caseNumber: "HF-313-0911",
    residentFirstName: "Gloria",
    residentLastName: "Thomas",
    streetAddress: "17171 Morang Avenue",
    zipCode: "48205",
    occupancyType: "owner",
    householdSize: 2,
    incomeRange: "$21,000-$40,000",
    applicantAge: 72,
    seniorHousehold: true,
    childrenInHousehold: false,
    accessibilityNeeds: false,
    repairCategory: "roof_water_intrusion",
    repairDescription: "Rainwater enters the attic and front bedroom ceiling during heavy storms.",
    assessmentSummary: "Reported roof leak with interior ceiling staining and moisture migration.",
    urgency: "high",
    startedWhen: "Three weeks ago",
    programSlug: "critical-home-repair",
    createdAt,
    workOrderId: "84080000-0000-4000-8000-000000000001",
    workOrderNumber: "HF-WO-00182",
    workOrderCreatedAt: "2026-09-18T14:00:00.000Z",
    bids: [
      {
        id: "84090000-0000-4000-8000-000000000001",
        contractorName: "Marcus Reed",
        companyName: "Reed Residential Services",
        estimatedPriceCents: 840000,
        estimatedDurationDays: 5,
        notes: "Roof inspection and moisture assessment required before final scope.",
        createdAt: "2026-09-19T15:00:00.000Z",
      },
      {
        id: "84090000-0000-4000-8000-000000000002",
        contractorName: "Alana Brooks",
        companyName: "Brooks Exterior Repair",
        estimatedPriceCents: 910000,
        estimatedDurationDays: 6,
        notes: "Includes roof patch, flashing review, and interior ceiling repair allowance.",
        createdAt: "2026-09-19T17:30:00.000Z",
      },
      {
        id: "84090000-0000-4000-8000-000000000003",
        contractorName: "DeShawn Miles",
        companyName: "Detroit Roof Response",
        estimatedPriceCents: 795000,
        estimatedDurationDays: 4,
        notes: "Estimate assumes limited decking replacement after assessment.",
        createdAt: "2026-09-19T19:15:00.000Z",
      },
    ],
  },
  {
    residentId: "84010000-0000-4000-8000-000000000003",
    homeId: "84020000-0000-4000-8000-000000000003",
    caseId: "84030000-0000-4000-8000-000000000003",
    repairNeedId: "84040000-0000-4000-8000-000000000003",
    assessmentId: "84050000-0000-4000-8000-000000000003",
    matchId: "84060000-0000-4000-8000-000000000003",
    photoIds: ["84070000-0000-4000-8000-000000000004"],
    caseNumber: "HF-313-0917",
    residentFirstName: "Lena",
    residentLastName: "Jackson",
    streetAddress: "9250 Eastburn Street",
    zipCode: "48224",
    occupancyType: "owner",
    householdSize: 1,
    incomeRange: "$21,000-$40,000",
    applicantAge: 67,
    seniorHousehold: true,
    childrenInHousehold: false,
    accessibilityNeeds: false,
    repairCategory: "hvac",
    repairDescription:
      "The furnace cycles off overnight and the home drops below safe temperature.",
    assessmentSummary:
      "Reported intermittent furnace failure requiring HVAC assessment and repair estimate.",
    urgency: "critical",
    startedWhen: "One week ago",
    programSlug: "wayne-metro-weatherization",
    createdAt,
    workOrderId: "84080000-0000-4000-8000-000000000002",
    workOrderNumber: "HF-WO-00191",
    workOrderCreatedAt: "2026-09-18T15:00:00.000Z",
    bids: [
      {
        id: "84090000-0000-4000-8000-000000000004",
        contractorName: "Marcus Reed",
        companyName: "Reed Residential Services",
        estimatedPriceCents: 520000,
        estimatedDurationDays: 3,
        notes: "Heating diagnostics and furnace repair estimate pending parts availability.",
        createdAt: "2026-09-19T16:20:00.000Z",
      },
    ],
  },
  {
    residentId: "84010000-0000-4000-8000-000000000004",
    homeId: "84020000-0000-4000-8000-000000000004",
    caseId: "84030000-0000-4000-8000-000000000004",
    repairNeedId: "84040000-0000-4000-8000-000000000004",
    assessmentId: "84050000-0000-4000-8000-000000000004",
    matchId: "84060000-0000-4000-8000-000000000004",
    photoIds: ["84070000-0000-4000-8000-000000000005"],
    caseNumber: "HF-313-0924",
    residentFirstName: "James",
    residentLastName: "Morris",
    streetAddress: "14927 Asbury Park",
    zipCode: "48227",
    occupancyType: "owner",
    householdSize: 4,
    incomeRange: "$41,000-$60,000",
    applicantAge: 59,
    seniorHousehold: false,
    childrenInHousehold: true,
    accessibilityNeeds: false,
    repairCategory: "electrical",
    repairDescription:
      "Two bedroom outlets spark and part of the second floor loses power intermittently.",
    assessmentSummary:
      "Reported electrical fault requiring licensed evaluation and repair estimate.",
    urgency: "high",
    startedWhen: "Two weeks ago",
    programSlug: "zero-percent-home-repair-loan",
    createdAt,
    workOrderId: "84080000-0000-4000-8000-000000000003",
    workOrderNumber: "HF-WO-00204",
    workOrderCreatedAt: "2026-09-18T15:30:00.000Z",
  },
  {
    residentId: "84010000-0000-4000-8000-000000000005",
    homeId: "84020000-0000-4000-8000-000000000005",
    caseId: "84030000-0000-4000-8000-000000000005",
    repairNeedId: "84040000-0000-4000-8000-000000000005",
    assessmentId: "84050000-0000-4000-8000-000000000005",
    matchId: "84060000-0000-4000-8000-000000000005",
    photoIds: ["84070000-0000-4000-8000-000000000006"],
    caseNumber: "HF-313-0932",
    residentFirstName: "Ruby",
    residentLastName: "Coleman",
    streetAddress: "2860 Bellevue Street",
    zipCode: "48214",
    occupancyType: "owner",
    householdSize: 2,
    incomeRange: "$21,000-$40,000",
    applicantAge: 74,
    seniorHousehold: true,
    childrenInHousehold: false,
    accessibilityNeeds: true,
    repairCategory: "accessibility",
    repairDescription: "Front entry stairs and railing are unsafe and limit home access.",
    assessmentSummary:
      "Reported accessibility hazard at primary entry requiring assessment and repair estimate.",
    urgency: "high",
    startedWhen: "One month ago",
    programSlug: "zero-percent-home-repair-loan",
    createdAt,
    workOrderId: "84080000-0000-4000-8000-000000000004",
    workOrderNumber: "HF-WO-00211",
    workOrderCreatedAt: "2026-09-18T16:00:00.000Z",
    bids: [
      {
        id: "84090000-0000-4000-8000-000000000005",
        contractorName: "Marcus Reed",
        companyName: "Reed Residential Services",
        estimatedPriceCents: 430000,
        estimatedDurationDays: 4,
        notes: "Assumes railing replacement and tread stabilization.",
        createdAt: "2026-09-19T14:10:00.000Z",
      },
      {
        id: "84090000-0000-4000-8000-000000000006",
        contractorName: "Nina Porter",
        companyName: "Access First Builders",
        estimatedPriceCents: 465000,
        estimatedDurationDays: 5,
        notes: "Includes code-compliant handrail and step repair.",
        createdAt: "2026-09-19T18:05:00.000Z",
      },
    ],
  },
  {
    residentId: "84010000-0000-4000-8000-000000000006",
    homeId: "84020000-0000-4000-8000-000000000006",
    caseId: "84030000-0000-4000-8000-000000000006",
    repairNeedId: "84040000-0000-4000-8000-000000000006",
    assessmentId: "84050000-0000-4000-8000-000000000006",
    matchId: "84060000-0000-4000-8000-000000000006",
    photoIds: ["84070000-0000-4000-8000-000000000007"],
    caseNumber: "HF-313-0940",
    residentFirstName: "Angela",
    residentLastName: "Ross",
    streetAddress: "6346 Junction Avenue",
    zipCode: "48210",
    occupancyType: "owner",
    householdSize: 3,
    incomeRange: "$21,000-$40,000",
    applicantAge: 63,
    seniorHousehold: true,
    childrenInHousehold: false,
    accessibilityNeeds: false,
    repairCategory: "plumbing",
    repairDescription:
      "Basement waste line backs up during laundry cycles and standing water collects near the drain.",
    assessmentSummary: "Reported plumbing backup requiring assessment and repair estimate.",
    urgency: "moderate",
    startedWhen: "Six weeks ago",
    programSlug: "zero-percent-home-repair-loan",
    createdAt,
    workOrderId: "84080000-0000-4000-8000-000000000005",
    workOrderNumber: "HF-WO-00218",
    workOrderCreatedAt: "2026-09-18T16:40:00.000Z",
    bids: [
      {
        id: "84090000-0000-4000-8000-000000000007",
        contractorName: "Marcus Reed",
        companyName: "Reed Residential Services",
        estimatedPriceCents: 310000,
        estimatedDurationDays: 2,
        notes: "Includes line inspection and spot repair estimate.",
        createdAt: "2026-09-19T13:35:00.000Z",
      },
    ],
  },
];

function toPriority(urgency: OverflowDemoCaseSeed["urgency"]) {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "high";
  return "moderate";
}

function buildScope(entry: OverflowDemoCaseSeed) {
  const priority = toPriority(entry.urgency);
  return [
    "REPORTED CONDITION",
    "",
    entry.repairDescription,
    "",
    "PRELIMINARY CATEGORY",
    "",
    repairCategoryLabels[entry.repairCategory],
    "",
    "PRIORITY",
    "",
    priority === "critical" ? "Critical" : priority === "high" ? "High" : "Moderate",
    "",
    "REQUESTED CONTRACTOR ACTION",
    "",
    `Review the reported ${repairCategoryLabels[entry.repairCategory].toLowerCase()} condition and provide an assessment and estimated repair scope.`,
    "",
    "AVAILABLE INFORMATION",
    "",
    "• Resident repair description",
    "• HomeFix preliminary assessment",
    entry.photoIds.length > 0 ? "• Submitted photographs" : "• No photographs available",
    "• Program information",
  ].join("\n");
}

export async function ensureOverflowDemoData() {
  await seedPrograms();

  const programRows = await db
    .select()
    .from(programs)
    .where(
      inArray(
        programs.slug,
        overflowDemoCases.map((item) => item.programSlug),
      ),
    );
  const programIdBySlug = new Map(programRows.map((program) => [program.slug, program.id]));

  await db
    .insert(residents)
    .values(
      overflowDemoCases.map((entry) => ({
        id: entry.residentId,
        firstName: entry.residentFirstName,
        lastName: entry.residentLastName,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.createdAt),
      })),
    )
    .onConflictDoUpdate({
      target: residents.id,
      set: { updatedAt: new Date(createdAt) },
    });

  await db
    .insert(homes)
    .values(
      overflowDemoCases.map((entry) => ({
        id: entry.homeId,
        residentId: entry.residentId,
        streetAddress: entry.streetAddress,
        city: "Detroit",
        state: "MI",
        zipCode: entry.zipCode,
        occupancyType: entry.occupancyType,
        primaryResidence: true,
        yearsAtProperty: 12,
        householdSize: entry.householdSize,
        incomeRange: entry.incomeRange,
        applicantAge: entry.applicantAge,
        seniorHousehold: entry.seniorHousehold,
        childrenInHousehold: entry.childrenInHousehold,
        accessibilityNeeds: entry.accessibilityNeeds,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.createdAt),
      })),
    )
    .onConflictDoUpdate({
      target: homes.id,
      set: { updatedAt: new Date(createdAt) },
    });

  await db
    .insert(repairCases)
    .values(
      overflowDemoCases.map((entry) => ({
        id: entry.caseId,
        homeId: entry.homeId,
        caseNumber: entry.caseNumber,
        status: "program_review",
        currentStep: "coverage",
        nextAction:
          entry.workOrderNumber == null
            ? "Create an overflow job for contractor response"
            : `Monitor contractor responses for ${entry.workOrderNumber}`,
        coveragePercentage: 100,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.createdAt),
      })),
    )
    .onConflictDoUpdate({
      target: repairCases.id,
      set: { updatedAt: new Date(createdAt) },
    });

  await db
    .insert(repairNeeds)
    .values(
      overflowDemoCases.map((entry) => ({
        id: entry.repairNeedId,
        repairCaseId: entry.caseId,
        category: entry.repairCategory,
        description: entry.repairDescription,
        startedWhen: entry.startedWhen,
        gettingWorse: true,
        safeToOccupy: entry.urgency !== "critical",
        urgency: entry.urgency,
        status: "reported",
        createdAt: new Date(entry.createdAt),
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(repairAssessments)
    .values(
      overflowDemoCases.map((entry) => ({
        id: entry.assessmentId,
        repairNeedId: entry.repairNeedId,
        predictedCategory: entry.repairCategory,
        urgency: entry.urgency,
        summary: entry.assessmentSummary,
        confidence: "0.92",
        model: "synthetic-demo",
        createdAt: new Date(entry.createdAt),
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(repairPhotos)
    .values(
      overflowDemoCases.flatMap((entry) =>
        entry.photoIds.map((photoId, index) => ({
          id: photoId,
          repairNeedId: entry.repairNeedId,
          imageUrl: `https://placehold.co/1200x800?text=${encodeURIComponent(entry.caseNumber)}+Photo+${index + 1}`,
          originalFilename: `${entry.caseNumber.toLowerCase()}-${index + 1}.jpg`,
          mimeType: "image/jpeg",
          bytes: 120000,
          width: 1200,
          height: 800,
          createdAt: new Date(entry.createdAt),
        })),
      ),
    )
    .onConflictDoNothing();

  await db
    .insert(programMatches)
    .values(
      overflowDemoCases.map((entry) => {
        const programId = programIdBySlug.get(entry.programSlug);
        if (!programId) {
          throw new Error(`Program slug ${entry.programSlug} was not seeded`);
        }
        return {
          id: entry.matchId,
          repairNeedId: entry.repairNeedId,
          programId,
          matchStatus: "strong_match",
          explanation:
            "Strong Match\n✓ Program criteria satisfied for synthetic demonstration data.",
          missingRequirements: [],
          createdAt: new Date(entry.createdAt),
        };
      }),
    )
    .onConflictDoUpdate({
      target: programMatches.id,
      set: { matchStatus: "strong_match" },
    });

  const workOrderEntries = overflowDemoCases.filter(
    (entry) => entry.workOrderId && entry.workOrderNumber,
  );
  if (workOrderEntries.length > 0) {
    for (const entry of workOrderEntries) {
      const programId = programIdBySlug.get(entry.programSlug);
      if (!programId || !entry.workOrderId || !entry.workOrderNumber || !entry.workOrderCreatedAt) {
        throw new Error(`Missing work order configuration for ${entry.caseNumber}`);
      }

      const seededBids = entry.bids ?? [];
      await db
        .insert(workOrders)
        .values({
          id: entry.workOrderId,
          repairCaseId: entry.caseId,
          repairNeedId: entry.repairNeedId,
          programId,
          workOrderNumber: entry.workOrderNumber,
          repairType: entry.repairCategory,
          scope: buildScope(entry),
          priority: toPriority(entry.urgency),
          fundingStatus: "program_approved",
          capacityStatus: "overflow",
          status: seededBids.length > 0 ? "bids_received" : "open",
          isSynthetic: true,
          createdAt: new Date(entry.workOrderCreatedAt),
          updatedAt: new Date(entry.workOrderCreatedAt),
        })
        .onConflictDoUpdate({
          target: workOrders.id,
          set: {
            repairCaseId: entry.caseId,
            repairNeedId: entry.repairNeedId,
            programId,
            workOrderNumber: entry.workOrderNumber,
            repairType: entry.repairCategory,
            scope: buildScope(entry),
            priority: toPriority(entry.urgency),
            fundingStatus: "program_approved",
            capacityStatus: "overflow",
            status: seededBids.length > 0 ? "bids_received" : "open",
            isSynthetic: true,
            updatedAt: new Date(createdAt),
          },
        });
    }

    await db
      .insert(bids)
      .values(
        workOrderEntries.flatMap((entry) =>
          (entry.bids ?? []).map((bidEntry) => ({
            id: bidEntry.id,
            workOrderId: entry.workOrderId!,
            contractorName: bidEntry.contractorName,
            companyName: bidEntry.companyName,
            estimatedPriceCents: bidEntry.estimatedPriceCents,
            estimatedDurationDays: bidEntry.estimatedDurationDays,
            notes: bidEntry.notes,
            status: "submitted",
            createdAt: new Date(bidEntry.createdAt),
          })),
        ),
      )
      .onConflictDoNothing();
  }
}

export async function getOverflowDemoCaseByCaseNumber(caseNumber: string) {
  return overflowDemoCases.find((entry) => entry.caseNumber === caseNumber) ?? null;
}

export async function findExistingOverflowWorkOrderByCaseNumber(caseNumber: string) {
  const entry = overflowDemoCases.find((item) => item.caseNumber === caseNumber);
  if (!entry) return null;

  const row = await db
    .select({
      id: workOrders.id,
      workOrderNumber: workOrders.workOrderNumber,
      status: workOrders.status,
    })
    .from(workOrders)
    .innerJoin(repairCases, eq(repairCases.id, workOrders.repairCaseId))
    .where(
      and(eq(repairCases.caseNumber, caseNumber), eq(workOrders.repairNeedId, entry.repairNeedId)),
    )
    .limit(1);

  return row[0] ?? null;
}
