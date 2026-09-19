type ProgramSeed = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  description: string;
  sourceUrl: string;
  applicationStatus: "open" | "closed" | "verification_required";
  lastVerifiedAt: string;
  requiredDocuments: string[];
  repairTypes: string[];
  rules: Array<{
    ruleType: string;
    operator: string;
    value: string | number | boolean | string[];
    required: boolean;
  }>;
};

const verifiedAt = "2026-09-19T00:00:00.000Z";

export const detroitProgramCatalog: ProgramSeed[] = [
  {
    id: "31300000-0000-4000-8000-000000000001",
    slug: "critical-home-repair",
    name: "City of Detroit Critical Home Repair",
    organization: "City of Detroit Housing and Revitalization Department",
    description: "Critical repairs for qualifying owner-occupied Detroit homes.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/home-repair-and-neighborhood-services/home-repair-programs",
    applicationStatus: "open",
    lastVerifiedAt: verifiedAt,
    requiredDocuments: [
      "Government-issued ID",
      "Proof of ownership",
      "Income verification",
      "Property tax status",
      "Repair photos",
    ],
    repairTypes: ["roof_water_intrusion", "plumbing", "accessibility", "structural"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
      { ruleType: "primary_residence", operator: "equals", value: true, required: true },
      { ruleType: "income_limit", operator: "lte", value: 62880, required: true },
      { ruleType: "senior_household", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  },
  {
    id: "31300000-0000-4000-8000-000000000002",
    slug: "wayne-metro-weatherization",
    name: "Wayne Metro Weatherization Assistance Program",
    organization: "Wayne Metropolitan Community Action Agency",
    description:
      "Energy-efficiency services that may include furnace evaluation and weatherization measures.",
    sourceUrl: "https://www.waynemetro.org/weatherization/",
    applicationStatus: "open",
    lastVerifiedAt: verifiedAt,
    requiredDocuments: [
      "Government-issued ID",
      "Income verification",
      "Utility information",
      "Proof of occupancy",
    ],
    repairTypes: ["hvac", "windows_doors"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "occupancy_type", operator: "in", value: ["owner", "renter"], required: true },
      { ruleType: "income_limit", operator: "lte", value: 62880, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  },
  {
    id: "31300000-0000-4000-8000-000000000003",
    slug: "detroit-leadsafe-housing",
    name: "Detroit LeadSafe Housing",
    organization: "City of Detroit Housing and Revitalization Department",
    description: "Lead hazard identification and reduction for eligible Detroit households.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/housing/lead-safe-housing-program",
    applicationStatus: "open",
    lastVerifiedAt: verifiedAt,
    requiredDocuments: [
      "Household roster",
      "Income verification",
      "Property information",
      "Lead testing documentation",
    ],
    repairTypes: ["lead_environmental"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "children_in_household", operator: "equals", value: true, required: true },
      { ruleType: "income_limit", operator: "lte", value: 83850, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  },
  {
    id: "31300000-0000-4000-8000-000000000004",
    slug: "zero-percent-home-repair-loan",
    name: "0% Interest Home Repair Loan Program",
    organization: "City of Detroit and Local Initiatives Support Corporation",
    description:
      "Interest-free financing for eligible Detroit owner-occupants to complete home repairs.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/homeowners/0-interest-home-repair-loans",
    applicationStatus: "verification_required",
    lastVerifiedAt: verifiedAt,
    requiredDocuments: [
      "Government-issued ID",
      "Proof of ownership",
      "Income verification",
      "Property tax status",
    ],
    repairTypes: [
      "roof_water_intrusion",
      "hvac",
      "plumbing",
      "electrical",
      "accessibility",
      "structural",
    ],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
      { ruleType: "primary_residence", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  },
  {
    id: "31300000-0000-4000-8000-000000000005",
    slug: "renew-detroit",
    name: "Renew Detroit",
    organization: "City of Detroit Housing and Revitalization Department",
    description:
      "A phased home-repair program serving selected low-income senior and disabled homeowners.",
    sourceUrl: "https://detroitmi.gov/government/mayors-office/renew-detroit",
    applicationStatus: "closed",
    lastVerifiedAt: verifiedAt,
    requiredDocuments: [
      "Government-issued ID",
      "Proof of ownership",
      "Income verification",
      "Property tax exemption records",
    ],
    repairTypes: ["roof_water_intrusion", "windows_doors"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
      { ruleType: "primary_residence", operator: "equals", value: true, required: true },
      { ruleType: "senior_household", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  },
];
