import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { contractorAccessAccounts } from "../db/schema.js";
import { repairCategories } from "../domain/repair.js";

const scrypt = promisify(scryptCallback);

export const contractorSignInSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  pin: z.string().regex(/^\d{4}$/),
});

export const contractorRegistrationSchema = contractorSignInSchema.extend({
  contractorComplianceConfirmed: z.literal(true),
});

const optionalProfileText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use a valid date")
  .transform((value) => value || null);

export const contractorProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
    contactName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(40),
    email: z.string().trim().email().max(254),
    performsInspections: z.boolean(),
    performsRepairs: z.boolean(),
    supervisesTraining: z.boolean(),
    repairSpecialties: z.array(z.enum(repairCategories)).max(repairCategories.length),
    serviceZipCodes: z
      .array(
        z
          .string()
          .trim()
          .regex(/^\d{5}$/, "Use a five-digit ZIP code"),
      )
      .max(50),
    licenseNumber: optionalProfileText(120),
    licenseExpiresOn: optionalDate,
    insuranceProvider: optionalProfileText(160),
    insuranceExpiresOn: optionalDate,
  })
  .superRefine((profile, context) => {
    if (!profile.performsInspections && !profile.performsRepairs && !profile.supervisesTraining) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performsInspections"],
        message: "Select at least one service capability",
      });
    }
  })
  .transform((profile) => ({
    ...profile,
    repairSpecialties: profile.performsRepairs ? [...new Set(profile.repairSpecialties)] : [],
    serviceZipCodes: [...new Set(profile.serviceZipCodes)],
  }));

type ContractorProfileRecord = {
  id: string;
  displayName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  performsInspections: boolean;
  performsRepairs: boolean;
  supervisesTraining: boolean;
  repairSpecialties: string[];
  serviceZipCodes: string[];
  licenseNumber: string | null;
  licenseExpiresOn: string | null;
  insuranceProvider: string | null;
  insuranceExpiresOn: string | null;
};

export function presentContractorProfile(account: ContractorProfileRecord) {
  return {
    ...account,
    profileComplete: Boolean(
      account.displayName.trim() &&
      account.contactName?.trim() &&
      account.phone?.trim() &&
      account.email?.trim() &&
      (account.performsInspections || account.performsRepairs || account.supervisesTraining),
    ),
  };
}

export class ContractorAccessError extends Error {
  constructor(readonly code: "ACCOUNT_EXISTS" | "INVALID_CREDENTIALS") {
    super(code);
    this.name = "ContractorAccessError";
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function hashContractorPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(pin, salt, 32)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyContractorPin(pin: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function registerContractor(input: z.infer<typeof contractorRegistrationSchema>) {
  const parsed = contractorRegistrationSchema.parse(input);
  const normalizedName = parsed.displayName.toLocaleLowerCase("en-US");
  const existingRows = await db
    .select({ id: contractorAccessAccounts.id })
    .from(contractorAccessAccounts)
    .where(eq(contractorAccessAccounts.normalizedName, normalizedName))
    .limit(1);
  if (existingRows[0]) throw new ContractorAccessError("ACCOUNT_EXISTS");

  let rows;
  try {
    rows = await db
      .insert(contractorAccessAccounts)
      .values({
        displayName: parsed.displayName,
        normalizedName,
        pinHash: await hashContractorPin(parsed.pin),
        contractorComplianceConfirmed: true,
        contractorComplianceConfirmedAt: new Date(),
      })
      .returning({
        id: contractorAccessAccounts.id,
        displayName: contractorAccessAccounts.displayName,
      });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ContractorAccessError("ACCOUNT_EXISTS");
    throw error;
  }
  const account = rows[0];
  if (!account) throw new Error("Contractor access could not be created");
  return { token: account.id, displayName: account.displayName };
}

export async function signInContractor(displayName: string, pin: string) {
  const parsed = contractorSignInSchema.parse({ displayName, pin });
  const normalizedName = parsed.displayName.toLocaleLowerCase("en-US");
  const existingRows = await db
    .select()
    .from(contractorAccessAccounts)
    .where(eq(contractorAccessAccounts.normalizedName, normalizedName))
    .limit(1);
  const existing = existingRows[0];

  if (!existing || !(await verifyContractorPin(parsed.pin, existing.pinHash))) {
    throw new ContractorAccessError("INVALID_CREDENTIALS");
  }

  await db
    .update(contractorAccessAccounts)
    .set({ displayName: parsed.displayName, updatedAt: new Date() })
    .where(eq(contractorAccessAccounts.id, existing.id));
  return { token: existing.id, displayName: parsed.displayName };
}

export async function getContractorAccess(token: string) {
  if (!z.string().uuid().safeParse(token).success) return null;
  return getContractorProfile(token);
}

export async function getContractorProfile(accountId: string) {
  const rows = await db
    .select({
      id: contractorAccessAccounts.id,
      displayName: contractorAccessAccounts.displayName,
      contactName: contractorAccessAccounts.contactName,
      phone: contractorAccessAccounts.phone,
      email: contractorAccessAccounts.email,
      performsInspections: contractorAccessAccounts.performsInspections,
      performsRepairs: contractorAccessAccounts.performsRepairs,
      supervisesTraining: contractorAccessAccounts.supervisesTraining,
      repairSpecialties: contractorAccessAccounts.repairSpecialties,
      serviceZipCodes: contractorAccessAccounts.serviceZipCodes,
      licenseNumber: contractorAccessAccounts.licenseNumber,
      licenseExpiresOn: contractorAccessAccounts.licenseExpiresOn,
      insuranceProvider: contractorAccessAccounts.insuranceProvider,
      insuranceExpiresOn: contractorAccessAccounts.insuranceExpiresOn,
    })
    .from(contractorAccessAccounts)
    .where(eq(contractorAccessAccounts.id, accountId))
    .limit(1);
  return rows[0] ? presentContractorProfile(rows[0]) : null;
}

export async function updateContractorProfile(accountId: string, input: unknown) {
  const parsed = contractorProfileSchema.parse(input);
  try {
    const rows = await db
      .update(contractorAccessAccounts)
      .set({
        ...parsed,
        normalizedName: parsed.displayName.toLocaleLowerCase("en-US"),
        updatedAt: new Date(),
      })
      .where(eq(contractorAccessAccounts.id, accountId))
      .returning({ id: contractorAccessAccounts.id });
    if (!rows[0]) throw new Error("Contractor account was not found");
  } catch (error) {
    if (isUniqueViolation(error)) throw new ContractorAccessError("ACCOUNT_EXISTS");
    throw error;
  }
  return getContractorProfile(accountId);
}
