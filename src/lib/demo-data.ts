export type MatchStatus = "Strong Match" | "Potential Match" | "Verification Needed" | "Application Closed" | "Waitlisted" | "Funding Gap";

export const resident = {
  name: "Denise Carter",
  address: "123 Main Street",
  city: "Detroit, MI 48224",
  passportId: "HF-48221-00128",
  caseId: "HF-313-0842",
  household: "3 residents",
  senior: true,
  years: 12,
  income: "$41,000–$60,000",
};

export const repairNeeds = [
  { name: "Roof / Water Intrusion", priority: "High", status: "Strong Match", program: "City of Detroit Critical Home Repair", action: "Review eligibility requirements" },
  { name: "Furnace / HVAC", priority: "Moderate", status: "Potential Match", program: "Wayne Metro Weatherization", action: "Upload income verification" },
  { name: "Lead / Environmental", priority: "Moderate", status: "Verification Needed", program: "Detroit LeadSafe Housing", action: "Complete household questions" },
  { name: "Electrical", priority: "Moderate", status: "Funding Gap", program: "No current resource", action: "Notify me when assistance opens" },
] as const;

export const programs = [
  {
    id: "critical-home-repair",
    name: "City of Detroit Critical Home Repair",
    organization: "City of Detroit Housing & Revitalization",
    status: "Open now · Deadline September 22, 2026 at 5 PM",
    types: "Serious roofs, plumbing, heating, electrical, and accessibility repairs",
    eligibility: "Owner-occupy a single-family Detroit home for at least one year; household includes a child under 18, person 62+, or person with a documented disability.",
    income: "Income limits apply: $44,040 for one person; $62,880 for four; $83,040 for eight.",
    ownership: "Homeowner and primary residence required",
    geography: "Detroit properties",
    documents: ["Government-issued ID", "Proof of ownership", "Income verification", "Property tax status", "Repair photos"],
    dates: "Pre-applications accepted through September 22, 2026 at 5 PM",
    next: "Create a Neighborly account, find Detroit Home Repair Programs, and submit the pre-application.",
    match: "Strong Match",
  },
  {
    id: "leadsafe",
    name: "Detroit LeadSafe Housing",
    organization: "City of Detroit",
    status: "Open now · Deadline September 22, 2026 at 5 PM",
    types: "Lead testing and eligible lead-hazard reduction work",
    eligibility: "Owner, qualifying landlord, or renter applying through the owner; a child under 6 regularly visits or a resident is pregnant.",
    income: "Income limits apply; example limits are $58,700 for one person and $83,850 for four.",
    ownership: "Owner participation required",
    geography: "Eligible Detroit ZIP codes",
    documents: ["Household roster", "Income verification", "Property tax status", "Lead testing documentation"],
    dates: "Pre-applications accepted through September 22, 2026 at 5 PM",
    next: "Use the Detroit Home Repair Neighborly application and complete lead documentation.",
    match: "Verification Needed",
  },
  {
    id: "weatherization",
    name: "Wayne Metro Weatherization Assistance",
    organization: "Wayne Metropolitan Community Action Agency",
    status: "Open · Accepting applications",
    types: "Insulation, air sealing, furnace evaluation, and energy-efficiency work",
    eligibility: "Low-income owner or renter with access to attic and basement. Some serious repair conditions may require correction first.",
    income: "Income documentation or qualifying assistance such as SNAP, TANF, SER, or SSI.",
    ownership: "Owners and renters may apply",
    geography: "Wayne County service area",
    documents: ["Government ID for adults", "Income documentation", "Utility information", "Proof of occupancy"],
    dates: "Accepting applications",
    next: "Apply through Wayne Metro or call 313-388-9799.",
    match: "Potential Match",
  },
] as const;

export const overflowJobs = [
  { id: "00182", property: "123 Main St", zip: "48224", repair: "Roof / Water Intrusion", priority: "High", program: "Critical Home Repair", status: "Open", responses: 3 },
  { id: "00191", property: "456 Dexter Ave", zip: "48206", repair: "Furnace", priority: "Critical", program: "Weatherization", status: "Assessment Needed", responses: 1 },
  { id: "00204", property: "789 Grandmont Ave", zip: "48227", repair: "Electrical", priority: "High", program: "Critical Home Repair", status: "Open", responses: 0 },
] as const;