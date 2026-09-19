const categoryLabels: Record<string, string> = {
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

export function toRepairCategoryLabel(value: string) {
  return categoryLabels[value] ?? value;
}
