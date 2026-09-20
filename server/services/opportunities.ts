import { and, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { opportunities } from "../db/schema.js";
import {
  opportunityStatuses,
  opportunityTypes,
  type OpportunityStatus,
  type OpportunityType,
} from "../domain/opportunity.js";

export const publicOpportunityFiltersSchema = z.object({
  type: z.enum(opportunityTypes).optional(),
  zipCode: z
    .string()
    .regex(/^482\d{2}$/)
    .optional(),
  repairCategory: z.string().trim().min(1).max(80).optional(),
  priority: z.enum(["low", "moderate", "high", "critical"]).optional(),
  status: z.enum(opportunityStatuses).exclude(["cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type PublicOpportunity = {
  publicNumber: string;
  type: OpportunityType;
  repairCategory: string;
  priority: string;
  publicScope: string;
  city: "Detroit";
  state: "MI";
  zipCode: string;
  fundingStatus: string | null;
  trainingOpportunityStatus: string | null;
  potentialSkills: string[];
  status: OpportunityStatus;
  publishedAt: string;
};

type PublicOpportunityRow = {
  publicNumber: string;
  type: OpportunityType;
  repairCategory: string;
  priority: string;
  publicScope: string;
  zipCode: string;
  fundingStatus: string | null;
  trainingOpportunityStatus: string | null;
  potentialSkills: string[];
  status: OpportunityStatus;
  publishedAt: Date;
};

const publicSelection = {
  publicNumber: opportunities.publicNumber,
  type: opportunities.type,
  repairCategory: opportunities.repairCategory,
  priority: opportunities.priority,
  publicScope: opportunities.publicScope,
  zipCode: opportunities.zipCode,
  fundingStatus: opportunities.fundingStatus,
  trainingOpportunityStatus: opportunities.trainingOpportunityStatus,
  potentialSkills: opportunities.potentialSkills,
  status: opportunities.status,
  publishedAt: opportunities.publishedAt,
};

export function mapPublicOpportunity(row: PublicOpportunityRow): PublicOpportunity {
  return {
    publicNumber: row.publicNumber,
    type: row.type,
    repairCategory: row.repairCategory,
    priority: row.priority,
    publicScope: row.publicScope,
    city: "Detroit",
    state: "MI",
    zipCode: row.zipCode,
    fundingStatus: row.fundingStatus,
    trainingOpportunityStatus: row.trainingOpportunityStatus,
    potentialSkills: row.potentialSkills,
    status: row.status,
    publishedAt: row.publishedAt.toISOString(),
  };
}

export async function listPublicOpportunities(input: unknown) {
  const filters = publicOpportunityFiltersSchema.parse(input);
  const conditions: SQL[] = [ne(opportunities.status, "cancelled")];
  if (filters.type) conditions.push(eq(opportunities.type, filters.type));
  if (filters.zipCode) conditions.push(eq(opportunities.zipCode, filters.zipCode));
  if (filters.repairCategory) {
    conditions.push(eq(opportunities.repairCategory, filters.repairCategory));
  }
  if (filters.priority) conditions.push(eq(opportunities.priority, filters.priority));
  if (filters.status) conditions.push(eq(opportunities.status, filters.status));

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db
      .select(publicSelection)
      .from(opportunities)
      .where(where)
      .orderBy(desc(opportunities.publishedAt), opportunities.publicNumber)
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(where),
  ]);

  return {
    items: rows.map(mapPublicOpportunity),
    page: filters.page,
    pageSize: filters.pageSize,
    total: Number(totals[0]?.count ?? 0),
  };
}

export async function getPublicOpportunity(publicNumber: string) {
  const rows = await db
    .select(publicSelection)
    .from(opportunities)
    .where(and(eq(opportunities.publicNumber, publicNumber), ne(opportunities.status, "cancelled")))
    .limit(1);
  return rows[0] ? mapPublicOpportunity(rows[0]) : null;
}
