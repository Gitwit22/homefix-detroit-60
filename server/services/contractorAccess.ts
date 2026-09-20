import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { contractorAccessAccounts } from "../db/schema.js";

const scrypt = promisify(scryptCallback);

export const contractorSignInSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  pin: z.string().regex(/^\d{4}$/),
});

export const contractorRegistrationSchema = contractorSignInSchema.extend({
  contractorComplianceConfirmed: z.literal(true),
});

export class ContractorAccessError extends Error {
  constructor(readonly code: "ACCOUNT_EXISTS" | "INVALID_CREDENTIALS") {
    super(code);
    this.name = "ContractorAccessError";
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
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
  const rows = await db
    .select({
      id: contractorAccessAccounts.id,
      displayName: contractorAccessAccounts.displayName,
    })
    .from(contractorAccessAccounts)
    .where(eq(contractorAccessAccounts.id, token))
    .limit(1);
  return rows[0] ?? null;
}