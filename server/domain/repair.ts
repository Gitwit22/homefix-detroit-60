export const repairCategories = [
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

export type RepairCategory = (typeof repairCategories)[number];

export const repairCategoryLabels: Record<RepairCategory, string> = {
  roof_water_intrusion: "Roof / Water Intrusion",
  hvac: "Furnace / HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  windows_doors: "Windows / Doors",
  accessibility: "Accessibility",
  lead_environmental: "Lead / Environmental",
  structural: "Structural",
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

export const triageUrgencies = ["low", "moderate", "high", "critical"] as const;
export type TriageUrgency = (typeof triageUrgencies)[number];
