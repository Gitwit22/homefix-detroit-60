export const repairCategories = [
  "roof_water_intrusion",
  "hvac",
  "plumbing",
  "electrical",
  "windows_doors",
  "accessibility",
  "lead_environmental",
  "structural",
  "carpentry",
  "drywall_plaster",
  "concrete_masonry",
  "flooring",
  "painting_finishing",
  "other",
] as const;

export type RepairCategory = (typeof repairCategories)[number];

export const triageRepairCategories = [
  "roof_water_intrusion",
  "hvac",
  "plumbing",
  "electrical",
  "windows_doors",
  "accessibility",
  "lead_environmental",
  "structural",
  "other",
] as const;

export type TriageRepairCategory = (typeof triageRepairCategories)[number];

export const repairCategoryLabels: Record<RepairCategory, string> = {
  roof_water_intrusion: "Roof / Water Intrusion",
  hvac: "Furnace / HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  windows_doors: "Windows / Doors",
  accessibility: "Accessibility",
  lead_environmental: "Lead / Environmental",
  structural: "Structural",
  carpentry: "Carpentry",
  drywall_plaster: "Drywall / Plaster",
  concrete_masonry: "Concrete / Masonry",
  flooring: "Flooring",
  painting_finishing: "Painting / Finishing",
  other: "Other",
};

const categoryAliases: Record<string, RepairCategory> = {
  "roof / water": "roof_water_intrusion",
  "roof / water intrusion": "roof_water_intrusion",
  roof: "roof_water_intrusion",
  "water damage": "roof_water_intrusion",
  heating: "hvac",
  furnace: "hvac",
  hvac: "hvac",
  plumbing: "plumbing",
  electrical: "electrical",
  accessibility: "accessibility",
  structural: "structural",
  carpentry: "carpentry",
  "drywall / plaster": "drywall_plaster",
  drywall: "drywall_plaster",
  plaster: "drywall_plaster",
  "concrete / masonry": "concrete_masonry",
  concrete: "concrete_masonry",
  masonry: "concrete_masonry",
  flooring: "flooring",
  "painting / finishing": "painting_finishing",
  painting: "painting_finishing",
  finishing: "painting_finishing",
  environmental: "lead_environmental",
  "lead / environmental": "lead_environmental",
  other: "other",
};

export function normalizeRepairCategory(value: string): RepairCategory {
  const normalized = value.trim().toLowerCase();
  if ((repairCategories as readonly string[]).includes(normalized)) {
    return normalized as RepairCategory;
  }
  return categoryAliases[normalized] ?? "other";
}

export function normalizeTriageRepairCategory(value: string): TriageRepairCategory {
  const normalized = normalizeRepairCategory(value);
  return (triageRepairCategories as readonly string[]).includes(normalized)
    ? (normalized as TriageRepairCategory)
    : "other";
}

export const triageUrgencies = ["low", "moderate", "high", "critical"] as const;
export type TriageUrgency = (typeof triageUrgencies)[number];

export const repairRoles = ["PRIMARY", "ACCESS", "RESTORATION"] as const;
export type RepairRole = (typeof repairRoles)[number];
