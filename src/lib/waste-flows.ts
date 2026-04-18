// Shared enum <-> label maps for WasteFlow fields. Kept in one place so the
// filter bar, table, and form all stay in sync.

export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const UNIT_OPTIONS = [
  { value: "KG", label: "kg" },
  { value: "TON", label: "ton" },
  { value: "LITER", label: "liter" },
  { value: "CUBIC_METER", label: "m³" },
  { value: "UNIT", label: "unit" },
  { value: "PIECE", label: "piece" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_OFF", label: "One-off" },
  { value: "CONTINUOUS", label: "Continuous" },
] as const;

export const TREATMENT_OPTIONS = [
  { value: "R1", label: "R1 — Energy recovery" },
  { value: "R2", label: "R2 — Solvent reclamation" },
  { value: "R3", label: "R3 — Recycling organics" },
  { value: "R4", label: "R4 — Recycling metals" },
  { value: "R5", label: "R5 — Recycling inorganics" },
  { value: "R6", label: "R6 — Regeneration of acids/bases" },
  { value: "R7", label: "R7 — Pollution abatement recovery" },
  { value: "R8", label: "R8 — Recovery from catalysts" },
  { value: "R9", label: "R9 — Oil re-refining" },
  { value: "R10", label: "R10 — Land treatment (agri)" },
  { value: "R11", label: "R11 — Use of residual wastes" },
  { value: "R12", label: "R12 — Waste exchange for R1–R11" },
  { value: "R13", label: "R13 — Storage pending recovery" },
  { value: "D1", label: "D1 — Landfill" },
  { value: "D2", label: "D2 — Land treatment" },
  { value: "D3", label: "D3 — Deep injection" },
  { value: "D4", label: "D4 — Surface impoundment" },
  { value: "D5", label: "D5 — Engineered landfill" },
  { value: "D6", label: "D6 — Release to water body" },
  { value: "D7", label: "D7 — Release to sea" },
  { value: "D8", label: "D8 — Biological treatment" },
  { value: "D9", label: "D9 — Physico-chemical treatment" },
  { value: "D10", label: "D10 — Incineration on land" },
  { value: "D11", label: "D11 — Incineration at sea" },
  { value: "D12", label: "D12 — Permanent storage" },
  { value: "D13", label: "D13 — Blending prior to D1–D12" },
  { value: "D14", label: "D14 — Repackaging prior to D1–D13" },
  { value: "D15", label: "D15 — Storage pending disposal" },
] as const;

// UI hint: which LoW chapter(s) a given category tends to map to. Used to
// pre-filter the LoW code combobox when the user picks a category.
export const CATEGORY_CHAPTERS: Record<string, string[]> = {
  packaging: ["15"],
  "paper-cardboard": ["03", "15", "20"],
  plastic: ["07", "12", "15", "17", "20"],
  metal: ["12", "16", "17", "19", "20"],
  glass: ["15", "17", "19", "20"],
  wood: ["03", "15", "17", "20"],
  organic: ["02", "19", "20"],
  "construction-demolition": ["17"],
  textile: ["04", "15", "19", "20"],
  weee: ["16", "20"],
  "oil-hydrocarbon": ["13", "19"],
  "hazardous-chemical": ["06", "07", "08", "14", "16", "18"],
  healthcare: ["18"],
  "mineral-extractive": ["01", "10"],
  "municipal-mixed": ["19", "20"],
};

// LoW chapter labels (for grouping in the combobox).
export const CHAPTER_LABELS: Record<string, string> = {
  "01": "01 — Mining & mineral processing",
  "02": "02 — Agriculture, food, forestry",
  "03": "03 — Wood, pulp, paper",
  "04": "04 — Leather, fur, textile",
  "05": "05 — Petroleum refining",
  "06": "06 — Inorganic chemicals",
  "07": "07 — Organic chemicals",
  "08": "08 — Coatings, adhesives, inks",
  "09": "09 — Photographic industry",
  "10": "10 — Thermal processes",
  "11": "11 — Metal surface treatment",
  "12": "12 — Shaping of metals & plastics",
  "13": "13 — Oil wastes",
  "14": "14 — Organic solvents",
  "15": "15 — Packaging, absorbents, rags",
  "16": "16 — Not otherwise specified (WEEE, ELV, batteries)",
  "17": "17 — Construction & demolition",
  "18": "18 — Healthcare",
  "19": "19 — Waste management facilities",
  "20": "20 — Municipal wastes",
};
