// Material-type categories used to filter/browse the LoW catalog in the UI.
// These are NOT a legal classification — the LoW code on the WasteFlow is.
// Each category lists the LoW chapters/sub-chapters commonly associated with it,
// purely as a hint for the UI to narrow the searchable code set.

export type WasteCategorySeed = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export const wasteCategories: WasteCategorySeed[] = [
  {
    slug: "packaging",
    name: "Packaging",
    description: "Waste packaging materials (paper, plastic, wood, metal, glass, composite). Mostly LoW chapter 15 01.",
    sortOrder: 10,
  },
  {
    slug: "paper-cardboard",
    name: "Paper & Cardboard",
    description: "Paper and cardboard waste not from packaging. LoW 03 03, 15 01 01, 20 01 01.",
    sortOrder: 20,
  },
  {
    slug: "plastic",
    name: "Plastic",
    description: "Plastic scraps, films, moulded parts. LoW 07 02, 12 01, 15 01 02, 17 02 03, 20 01 39.",
    sortOrder: 30,
  },
  {
    slug: "metal",
    name: "Metal",
    description: "Ferrous and non-ferrous metal waste. LoW 12 01, 17 04, 19 12 02/03, 20 01 40.",
    sortOrder: 40,
  },
  {
    slug: "glass",
    name: "Glass",
    description: "Waste glass. LoW 15 01 07, 17 02 02, 19 12 05, 20 01 02.",
    sortOrder: 50,
  },
  {
    slug: "wood",
    name: "Wood",
    description: "Wood waste including pallets. LoW 03 01/02, 15 01 03, 17 02 01, 20 01 38.",
    sortOrder: 60,
  },
  {
    slug: "organic",
    name: "Organic / Biowaste",
    description: "Food, garden, and biodegradable waste. LoW 02, 20 01 08, 20 02 01.",
    sortOrder: 70,
  },
  {
    slug: "construction-demolition",
    name: "Construction & Demolition",
    description: "Building and demolition materials (concrete, brick, tile, mixed inert). LoW chapter 17.",
    sortOrder: 80,
  },
  {
    slug: "textile",
    name: "Textile",
    description: "Fabric scraps, used clothing, fibres. LoW chapter 04, 15 01 09, 20 01 10/11.",
    sortOrder: 90,
  },
  {
    slug: "weee",
    name: "Electronic (WEEE)",
    description: "Waste electrical and electronic equipment. LoW 16 02, 20 01 21/23/35/36.",
    sortOrder: 100,
  },
  {
    slug: "oil-hydrocarbon",
    name: "Oil & Hydrocarbons",
    description: "Waste oils, fuels, lubricants (mostly hazardous). LoW chapters 13, 19 11.",
    sortOrder: 110,
  },
  {
    slug: "hazardous-chemical",
    name: "Hazardous Chemical",
    description: "Solvents, acids, bases, lab chemicals. LoW chapters 06, 07, 08, 14, 16 05.",
    sortOrder: 120,
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    description: "Clinical and pharmaceutical waste. LoW chapter 18.",
    sortOrder: 130,
  },
  {
    slug: "mineral-extractive",
    name: "Mineral / Extractive",
    description: "Mining, quarrying, mineral processing waste. LoW chapter 01.",
    sortOrder: 140,
  },
  {
    slug: "municipal-mixed",
    name: "Municipal / Mixed",
    description: "Mixed municipal and residual waste streams. LoW chapter 20.",
    sortOrder: 150,
  },
];
