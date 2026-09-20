import type { ProgramRuleInput } from "../validation/program-rules.js";

export type ProgramSeed = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  recordType: "resident_program" | "funding_layer";
  governmentLevel: string;
  fundingSource: string;
  description: string;
  sourceUrl: string;
  applicationUrl: string | null;
  phone: string | null;
  applicationStatus:
    "open" | "current" | "limited" | "interest_list" | "closed" | "transitioning" | "funding_layer";
  applicationOpenDate: string | null;
  applicationCloseDate: string | null;
  active: boolean;
  matchable: boolean;
  ownerOccupiedRequired: boolean;
  rentersEligible: boolean;
  landlordsEligible: boolean;
  minimumAge: number | null;
  childRequired: boolean;
  disabilityRequired: boolean;
  pregnancyQualifier: boolean;
  incomeLimitType: string | null;
  maxAmi: number | null;
  taxesCurrentRequired: boolean;
  paymentPlanAccepted: boolean;
  geographicRestriction: string | null;
  disasterTieBackRequired: boolean;
  benefitType: string;
  residentEntryPoint: string | null;
  notes: string | null;
  lastVerifiedAt: string;
  requiredDocuments: string[];
  repairTypes: string[];
  rules: Array<ProgramRuleInput & { value: unknown }>;
};

const verifiedAt = "2026-09-19T00:00:00.000Z";
const cityProgramsUrl =
  "https://detroitmi.gov/departments/housing-and-revitalization-department/home-repair-and-neighborhood-services/home-repair-programs";
const commonDocuments = ["Government-issued ID", "Income verification", "Property information"];

const cityOwnerRules: Array<ProgramRuleInput & { value: unknown }> = [
  { ruleType: "city", operator: "equals", value: "Detroit", required: true },
  { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
  { ruleType: "primary_residence", operator: "equals", value: true, required: true },
];

function catalogRecord(
  input: Omit<
    ProgramSeed,
    | "active"
    | "applicationOpenDate"
    | "applicationUrl"
    | "childRequired"
    | "disabilityRequired"
    | "landlordsEligible"
    | "lastVerifiedAt"
    | "minimumAge"
    | "notes"
    | "ownerOccupiedRequired"
    | "paymentPlanAccepted"
    | "phone"
    | "pregnancyQualifier"
    | "rentersEligible"
    | "taxesCurrentRequired"
  > &
    Partial<
      Pick<
        ProgramSeed,
        | "active"
        | "applicationOpenDate"
        | "applicationUrl"
        | "childRequired"
        | "disabilityRequired"
        | "landlordsEligible"
        | "minimumAge"
        | "notes"
        | "ownerOccupiedRequired"
        | "paymentPlanAccepted"
        | "phone"
        | "pregnancyQualifier"
        | "rentersEligible"
        | "taxesCurrentRequired"
      >
    >,
): ProgramSeed {
  return {
    active: true,
    applicationOpenDate: null,
    applicationUrl: null,
    childRequired: false,
    disabilityRequired: false,
    landlordsEligible: false,
    lastVerifiedAt: verifiedAt,
    minimumAge: null,
    notes: null,
    ownerOccupiedRequired: false,
    paymentPlanAccepted: false,
    phone: null,
    pregnancyQualifier: false,
    rentersEligible: false,
    taxesCurrentRequired: false,
    ...input,
  };
}

export const detroitProgramCatalog: ProgramSeed[] = [
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000001",
    slug: "critical-home-repair",
    name: "Critical Home Repair Program",
    organization: "City of Detroit Housing and Revitalization Department",
    recordType: "resident_program",
    governmentLevel: "City and federal",
    fundingSource: "Community Development Block Grant",
    description:
      "Severe roof leaks, plumbing, furnace or boiler, electrical hazards, and accessibility repairs.",
    sourceUrl: cityProgramsUrl,
    applicationUrl: cityProgramsUrl,
    applicationStatus: "open",
    applicationCloseDate: "2026-09-22T21:00:00.000Z",
    matchable: true,
    ownerOccupiedRequired: true,
    incomeLimitType: "Program income limits apply",
    maxAmi: null,
    taxesCurrentRequired: true,
    paymentPlanAccepted: true,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Grant-funded critical repair",
    residentEntryPoint: "City home-repair application",
    notes:
      "Applicant must have a child under 18, a resident age 62 or older, or a documented disability.",
    requiredDocuments: [
      ...commonDocuments,
      "Proof of ownership",
      "Property tax status",
      "Repair photos",
    ],
    repairTypes: ["roof_water_intrusion", "plumbing", "hvac", "electrical", "accessibility"],
    rules: [
      ...cityOwnerRules,
      { ruleType: "household_qualifier", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "open", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000003",
    slug: "detroit-leadsafe-housing",
    name: "Detroit LeadSafe Housing Program",
    organization: "City of Detroit Housing and Revitalization Department",
    recordType: "resident_program",
    governmentLevel: "City and federal",
    fundingSource: "HUD lead-hazard funding",
    description: "Lead-paint hazard reduction and related repairs for eligible Detroit households.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/housing/lead-safe-housing-program",
    applicationUrl: cityProgramsUrl,
    applicationStatus: "current",
    applicationCloseDate: null,
    matchable: true,
    rentersEligible: true,
    childRequired: true,
    pregnancyQualifier: true,
    incomeLimitType: "HUD income limits apply",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Lead hazard reduction",
    residentEntryPoint: "City home-repair application during open periods",
    notes:
      "Generally requires a child under 6 living in or regularly visiting the home, or a pregnant resident.",
    requiredDocuments: [...commonDocuments, "Household roster", "Lead testing documentation"],
    repairTypes: ["lead_environmental"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "lead_household_qualifier", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "current", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000006",
    slug: "cdbg-dr-private-sewer-repair",
    name: "CDBG-DR Private Sewer Repair Program",
    organization: "City of Detroit",
    recordType: "resident_program",
    governmentLevel: "City and federal",
    fundingSource: "HUD Community Development Block Grant Disaster Recovery",
    description: "Private sewer laterals and qualifying sewer or flood-related repairs.",
    sourceUrl: cityProgramsUrl,
    applicationStatus: "current",
    applicationCloseDate: null,
    matchable: true,
    ownerOccupiedRequired: true,
    incomeLimitType: "Low- and moderate-income eligibility",
    maxAmi: null,
    geographicRestriction: "Eligible June 2021 flood-impacted Detroit neighborhoods",
    disasterTieBackRequired: true,
    benefitType: "Disaster recovery repair assistance",
    residentEntryPoint: "City housing-repair intake",
    requiredDocuments: [...commonDocuments, "Proof of June 25-26, 2021 flood impact"],
    repairTypes: ["plumbing", "water_sewer"],
    rules: [
      ...cityOwnerRules,
      { ruleType: "geographic_eligibility", operator: "equals", value: true, required: true },
      { ruleType: "disaster_tie_back", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "current", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000007",
    slug: "detroit-home-accessibility-program",
    name: "Detroit Home Accessibility Program (DHAP)",
    organization: "City of Detroit with CHN Housing Partners and Detroit Housing Network",
    recordType: "resident_program",
    governmentLevel: "City and federal",
    fundingSource: "American Rescue Plan Act",
    description:
      "Ramps, widened doors, bathroom modifications, and similar accessibility improvements.",
    sourceUrl: cityProgramsUrl,
    applicationStatus: "limited",
    applicationCloseDate: null,
    matchable: true,
    disabilityRequired: true,
    incomeLimitType: "Program income and property requirements apply",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Accessibility modification",
    residentEntryPoint: "Confirm current intake availability with CHN or Detroit Housing Network",
    notes: "Current slot availability requires confirmation.",
    requiredDocuments: [...commonDocuments, "Disability documentation"],
    repairTypes: ["accessibility"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "accessibility_need", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "limited", required: false },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000002",
    slug: "wayne-metro-weatherization",
    name: "Weatherization Assistance Program",
    organization: "Wayne Metropolitan Community Action Agency",
    recordType: "resident_program",
    governmentLevel: "Federal, state, and local",
    fundingSource: "U.S. DOE and LIHEAP through the State of Michigan",
    description:
      "Insulation, air sealing, ventilation, energy conservation, and related health and safety work.",
    sourceUrl: "https://www.waynemetro.org/weatherization/",
    applicationUrl: "https://www.waynemetro.org/weatherization/",
    applicationStatus: "current",
    applicationCloseDate: null,
    matchable: true,
    rentersEligible: true,
    incomeLimitType: "Federal weatherization income limits apply",
    maxAmi: null,
    geographicRestriction: "Local weatherization operator service area",
    disasterTieBackRequired: false,
    benefitType: "Energy-efficiency services",
    residentEntryPoint: "Local weatherization operator",
    requiredDocuments: [...commonDocuments, "Utility information", "Proof of occupancy"],
    repairTypes: ["hvac", "windows_doors", "insulation", "ventilation"],
    rules: [
      { ruleType: "city", operator: "equals", value: "Detroit", required: true },
      { ruleType: "occupancy_type", operator: "in", value: ["owner", "renter"], required: true },
      { ruleType: "application_status", operator: "equals", value: "current", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000008",
    slug: "state-emergency-relief-home-repairs",
    name: "State Emergency Relief - Home Repairs",
    organization: "Michigan Department of Health and Human Services",
    recordType: "resident_program",
    governmentLevel: "State",
    fundingSource: "State Emergency Relief",
    description:
      "Emergency furnace, water heater, septic, and other essential health and safety repairs.",
    sourceUrl: "https://www.michigan.gov/mdhhs/assistance-programs/emergency-relief/home-utilities",
    applicationUrl: "https://newmibridges.michigan.gov/",
    applicationStatus: "current",
    applicationCloseDate: null,
    matchable: true,
    ownerOccupiedRequired: true,
    incomeLimitType: "State financial and housing-cost requirements apply",
    maxAmi: null,
    geographicRestriction: "Michigan",
    disasterTieBackRequired: false,
    benefitType: "Emergency repair assistance",
    residentEntryPoint: "MI Bridges",
    requiredDocuments: [...commonDocuments, "Proof of ownership or purchase", "Repair estimate"],
    repairTypes: ["hvac", "plumbing", "water_sewer", "electrical"],
    rules: [
      { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
      { ruleType: "primary_residence", operator: "equals", value: true, required: true },
      { ruleType: "application_status", operator: "equals", value: "current", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000009",
    slug: "michigan-saves-lead-fund",
    name: "Michigan Saves Lead Poisoning Prevention Fund",
    organization: "Michigan Saves",
    recordType: "resident_program",
    governmentLevel: "State-supported",
    fundingSource: "Lead Poisoning Prevention Fund",
    description: "Lead hazard work combining financing with project-cost assistance.",
    sourceUrl: "https://michigansaves.org/",
    applicationStatus: "current",
    applicationCloseDate: null,
    matchable: true,
    ownerOccupiedRequired: true,
    incomeLimitType: "Program underwriting and assistance limits apply",
    maxAmi: null,
    geographicRestriction: "Michigan",
    disasterTieBackRequired: false,
    benefitType: "Financing and project-cost assistance",
    residentEntryPoint: "Michigan Saves",
    requiredDocuments: [...commonDocuments, "Proof of ownership", "Lead project estimate"],
    repairTypes: ["lead_environmental"],
    rules: [
      { ruleType: "occupancy_type", operator: "equals", value: "owner", required: true },
      { ruleType: "application_status", operator: "equals", value: "current", required: true },
    ],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000010",
    slug: "bridging-neighborhoods-home-swap",
    name: "Bridging Neighborhoods Home Swap",
    organization: "City of Detroit Bridging Neighborhoods Program",
    recordType: "resident_program",
    governmentLevel: "City and state",
    fundingSource: "Gordie Howe International Bridge mitigation funding",
    description:
      "Moves qualifying residents from affected properties into fully renovated Detroit homes.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/bridging-neighborhoods-program",
    applicationStatus: "limited",
    applicationCloseDate: null,
    matchable: false,
    ownerOccupiedRequired: true,
    incomeLimitType: null,
    maxAmi: null,
    geographicRestriction: "Qualifying Delray and I-75 bridge-impact properties",
    disasterTieBackRequired: false,
    benefitType: "Home swap",
    residentEntryPoint: "Bridging Neighborhoods 2026 application process",
    notes:
      "This is an extremely geographically restricted relocation program, not ordinary repair coverage.",
    requiredDocuments: [
      ...commonDocuments,
      "Proof of ownership",
      "Bridge-impact property verification",
    ],
    repairTypes: ["relocation"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000011",
    slug: "landlord-rrp-training-incentive",
    name: "Landlord RRP Training & Incentive Program",
    organization: "City of Detroit",
    recordType: "resident_program",
    governmentLevel: "City",
    fundingSource: "City General Fund",
    description:
      "Lead-safe renovation training and compliance incentives for small Detroit landlords.",
    sourceUrl:
      "https://detroitmi.gov/departments/buildings-safety-engineering-and-environmental-department",
    applicationStatus: "interest_list",
    applicationCloseDate: null,
    matchable: false,
    landlordsEligible: true,
    incomeLimitType: "Affordability requirements apply",
    maxAmi: null,
    taxesCurrentRequired: true,
    geographicRestriction: "Detroit rental properties with 1-5 units",
    disasterTieBackRequired: false,
    benefitType: "Training and potential compliance incentive",
    residentEntryPoint: "City inquiry or notification process",
    notes:
      "Previous awards supported up to $10,000 per unit for up to three units; current award availability must be verified.",
    requiredDocuments: [
      ...commonDocuments,
      "Rental registration",
      "Certificate of Compliance records",
    ],
    repairTypes: ["lead_environmental"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000005",
    slug: "renew-detroit",
    name: "Renew Detroit",
    organization: "City of Detroit Housing and Revitalization Department",
    recordType: "resident_program",
    governmentLevel: "City, federal, and state",
    fundingSource: "Federal and state recovery funding",
    description:
      "Phased roof and window repairs for selected low-income senior and disabled homeowners.",
    sourceUrl: "https://detroitmi.gov/government/mayors-office/renew-detroit",
    applicationStatus: "closed",
    applicationCloseDate: null,
    matchable: false,
    ownerOccupiedRequired: true,
    minimumAge: 62,
    disabilityRequired: true,
    incomeLimitType: "Low-income eligibility",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Roof or window replacement",
    residentEntryPoint: null,
    notes: "Phases 1 and 2 concluded and applications are closed.",
    requiredDocuments: commonDocuments,
    repairTypes: ["roof_water_intrusion", "windows_doors"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000004",
    slug: "zero-percent-home-repair-loan",
    name: "Detroit 0% Interest Home Repair Loan Program",
    organization: "City of Detroit and Local Initiatives Support Corporation",
    recordType: "resident_program",
    governmentLevel: "City",
    fundingSource: "Public-private loan program",
    description:
      "Interest-free financing for eligible Detroit owner-occupants to complete home repairs.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/homeowners/0-interest-home-repair-loans",
    applicationStatus: "transitioning",
    applicationCloseDate: "2026-06-30T23:59:59.000Z",
    matchable: false,
    ownerOccupiedRequired: true,
    incomeLimitType: "Program income limits applied",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Zero-interest loan",
    residentEntryPoint: null,
    notes:
      "The prior program ended in June 2026; Detroit expects a redesigned program around early 2027.",
    requiredDocuments: commonDocuments,
    repairTypes: [
      "roof_water_intrusion",
      "hvac",
      "plumbing",
      "electrical",
      "accessibility",
      "structural",
    ],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000012",
    slug: "senior-emergency-home-repair",
    name: "Senior Emergency Home Repair Program",
    organization: "City of Detroit",
    recordType: "resident_program",
    governmentLevel: "City",
    fundingSource: "City housing repair funding",
    description: "Emergency repairs for qualifying senior homeowners.",
    sourceUrl: cityProgramsUrl,
    applicationStatus: "transitioning",
    applicationCloseDate: null,
    matchable: false,
    ownerOccupiedRequired: true,
    minimumAge: 62,
    incomeLimitType: "Program income limits applied",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Emergency repair",
    residentEntryPoint: "Critical Home Repair Program",
    notes:
      "This program was replaced by the expanded Critical Home Repair Program launched in 2025.",
    requiredDocuments: commonDocuments,
    repairTypes: ["roof_water_intrusion", "hvac", "plumbing", "electrical"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000013",
    slug: "basement-backup-protection",
    name: "Detroit Basement Backup Protection Program",
    organization: "City of Detroit Water and Sewerage Department",
    recordType: "resident_program",
    governmentLevel: "City",
    fundingSource: "Flood mitigation funding",
    description: "Backwater valves, sump pumps, and related basement flood-protection measures.",
    sourceUrl: "https://detroitmi.gov/departments/water-and-sewerage-department",
    applicationStatus: "closed",
    applicationCloseDate: null,
    matchable: false,
    incomeLimitType: null,
    maxAmi: null,
    geographicRestriction: "Selected Detroit neighborhoods",
    disasterTieBackRequired: false,
    benefitType: "Flood mitigation installation",
    residentEntryPoint: null,
    notes:
      "Phases 1 and 2 are closed; applications may reopen if additional funding becomes available.",
    requiredDocuments: commonDocuments,
    repairTypes: ["water_sewer", "plumbing"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000014",
    slug: "stellantis-home-repair-phase-3",
    name: "Stellantis Home Repair Program - Phase 3",
    organization: "City of Detroit",
    recordType: "resident_program",
    governmentLevel: "City and private",
    fundingSource: "Stellantis community benefits funding",
    description:
      "Repairs for owner-occupied homes surrounding the Detroit Assembly Complex - Mack impact area.",
    sourceUrl: cityProgramsUrl,
    applicationStatus: "closed",
    applicationCloseDate: "2025-07-31T23:59:59.000Z",
    matchable: false,
    ownerOccupiedRequired: true,
    incomeLimitType: "Program requirements applied",
    maxAmi: null,
    geographicRestriction: "Detroit Assembly Complex - Mack impact area",
    disasterTieBackRequired: false,
    benefitType: "Home repair grant",
    residentEntryPoint: null,
    notes: "Application period closed; participants were selected in July 2025.",
    requiredDocuments: commonDocuments,
    repairTypes: ["roof_water_intrusion", "hvac", "windows_doors", "structural"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000015",
    slug: "detroit-duplex-repair",
    name: "Detroit Duplex Repair Program",
    organization: "City of Detroit",
    recordType: "resident_program",
    governmentLevel: "City and federal",
    fundingSource: "American Rescue Plan Act",
    description: "Repair grants for small Detroit landlords seeking Certificates of Compliance.",
    sourceUrl: cityProgramsUrl,
    applicationStatus: "closed",
    applicationCloseDate: null,
    matchable: false,
    landlordsEligible: true,
    incomeLimitType: "Affordability requirements applied",
    maxAmi: null,
    geographicRestriction: "Detroit duplex properties",
    disasterTieBackRequired: false,
    benefitType: "Rental repair grant",
    residentEntryPoint: null,
    notes: "Detroit planning documents describe the pilot as closed.",
    requiredDocuments: commonDocuments,
    repairTypes: ["roof_water_intrusion", "hvac", "plumbing", "electrical", "structural"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000016",
    slug: "i-75-environmental-mitigation",
    name: "I-75 Environmental Mitigation Program",
    organization: "City of Detroit Bridging Neighborhoods Program",
    recordType: "resident_program",
    governmentLevel: "City, state, and international bridge partnership",
    fundingSource: "Gordie Howe International Bridge mitigation funding",
    description:
      "Windows, HVAC, insulation, and air-quality or noise improvements for affected properties.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/bridging-neighborhoods-program",
    applicationStatus: "closed",
    applicationCloseDate: "2021-12-31T23:59:59.000Z",
    matchable: false,
    incomeLimitType: null,
    maxAmi: null,
    geographicRestriction: "Qualifying I-75 bridge-impact properties",
    disasterTieBackRequired: false,
    benefitType: "Environmental mitigation",
    residentEntryPoint: "Bridging Neighborhoods Program",
    notes: "The third and final enrollment period ended in 2021.",
    requiredDocuments: commonDocuments,
    repairTypes: ["windows_doors", "hvac", "insulation", "lead_environmental"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000017",
    slug: "hud-lead-hazard-reduction-grants",
    name: "HUD Lead Hazard Reduction Grants",
    organization: "City of Detroit Housing and Revitalization Department",
    recordType: "funding_layer",
    governmentLevel: "Federal and city",
    fundingSource: "HUD Lead Hazard Reduction grants",
    description:
      "Federal grant layer supporting lead-hazard reduction delivered through City programs.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/housing/lead-safe-housing-program",
    applicationStatus: "funding_layer",
    applicationCloseDate: null,
    matchable: false,
    incomeLimitType: "Requirements are applied by the resident-facing program",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Program funding layer",
    residentEntryPoint: "Detroit LeadSafe Housing Program",
    notes:
      "Detroit's 2026 plan lists multiple active Lead Hazard Reduction grants totaling $21.15 million. This is not a separate public application.",
    requiredDocuments: [],
    repairTypes: ["lead_environmental"],
    rules: [],
  }),
  catalogRecord({
    id: "31300000-0000-4000-8000-000000000018",
    slug: "healthy-homes-production",
    name: "Healthy Homes Production Program",
    organization: "City of Detroit Housing and Revitalization Department",
    recordType: "funding_layer",
    governmentLevel: "Federal and city",
    fundingSource: "HUD Healthy Homes Production",
    description:
      "Funding layer for mold, electrical, temperature, asbestos, radon, and other housing-health interventions.",
    sourceUrl:
      "https://detroitmi.gov/departments/housing-and-revitalization-department/housing/lead-safe-housing-program",
    applicationStatus: "funding_layer",
    applicationCloseDate: null,
    matchable: false,
    incomeLimitType: "Requirements are applied by the resident-facing program",
    maxAmi: null,
    geographicRestriction: "Detroit city limits",
    disasterTieBackRequired: false,
    benefitType: "Program funding layer",
    residentEntryPoint: "LeadSafe or another City housing-repair channel",
    notes: "This is not a separate public application.",
    requiredDocuments: [],
    repairTypes: ["lead_environmental", "electrical", "hvac", "structural"],
    rules: [],
  }),
];
