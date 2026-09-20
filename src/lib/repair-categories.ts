const categoryLabels: Record<string, string> = {
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

export function toRepairCategoryLabel(value: string) {
  return categoryLabels[value] ?? value;
}
