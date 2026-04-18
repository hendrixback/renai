// List of Waste (LoW) / European Waste Catalogue (EWC) — curated subset
// covering all 20 chapters of Commission Decision 2014/955/EU.
//
// Full catalog = 842 entries. This seed includes ~120 of the most commonly
// used codes in B2B waste streams (packaging, C&D, metals, plastics, oils,
// food, municipal, WEEE, common hazardous). To extend:
//   1. Source the full annex from EUR-Lex CELEX:32014D0955.
//   2. Append rows below OR switch to a CSV loader (see prisma/seed.ts).
//
// Hazardous entries end with "*" in the printed LoW; here they are marked
// `isHazardous: true`. Mirror entries (same material, haz-or-not depending
// on composition) are marked `isMirrorEntry: true` on both twin codes.

export type WasteCodeSeed = {
  code: string; // stable key, no spaces: "150101"
  displayCode: string; // human-readable: "15 01 01"
  description: string;
  chapterCode: string; // "15"
  subChapterCode: string; // "1501"
  isHazardous: boolean;
  isMirrorEntry: boolean;
};

const CATALOG_VERSION = "2014/955/EU";

// Helper: build a WasteCodeSeed tersely.
function wc(
  code: string,
  description: string,
  opts: { hazardous?: boolean; mirror?: boolean } = {},
): WasteCodeSeed {
  const clean = code.replace(/\s|\*/g, "");
  const displayCode = `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)}${opts.hazardous ? "*" : ""}`;
  return {
    code: clean,
    displayCode,
    description,
    chapterCode: clean.slice(0, 2),
    subChapterCode: clean.slice(0, 4),
    isHazardous: !!opts.hazardous,
    isMirrorEntry: !!opts.mirror,
  };
}

export const wasteCodes: WasteCodeSeed[] = [
  // ─── 01 — Mining, quarrying, mineral processing ──────────────
  wc("010101", "wastes from mineral metalliferous excavation"),
  wc("010102", "wastes from mineral non-metalliferous excavation"),
  wc("010408", "waste gravel and crushed rocks other than those mentioned in 01 04 07"),
  wc("010409", "waste sand and clays"),
  wc("010413", "wastes from stone cutting and sawing other than those mentioned in 01 04 07"),

  // ─── 02 — Agriculture, food, horticulture, aquaculture ───────
  wc("020103", "plant-tissue waste"),
  wc("020104", "waste plastics (excluding packaging)"),
  wc("020106", "animal faeces, urine and manure (including spoiled straw)"),
  wc("020108", "agrochemical waste containing dangerous substances", { hazardous: true, mirror: true }),
  wc("020109", "agrochemical waste other than those mentioned in 02 01 08", { mirror: true }),
  wc("020202", "animal-tissue waste"),
  wc("020203", "materials unsuitable for consumption or processing"),
  wc("020304", "materials unsuitable for consumption or processing"),
  wc("020305", "sludges from on-site effluent treatment"),
  wc("020501", "materials unsuitable for consumption or processing"),
  wc("020601", "materials unsuitable for consumption or processing"),
  wc("020704", "materials unsuitable for consumption or processing"),

  // ─── 03 — Wood, pulp, paper, furniture ───────────────────────
  wc("030101", "waste bark and cork"),
  wc("030105", "sawdust, shavings, cuttings, wood, particle board and veneer other than those mentioned in 03 01 04"),
  wc("030104", "sawdust, shavings, cuttings, wood, particle board and veneer containing dangerous substances", { hazardous: true, mirror: true }),
  wc("030301", "waste bark and wood"),
  wc("030307", "mechanically separated rejects from pulping of waste paper and cardboard"),
  wc("030308", "wastes from sorting of paper and cardboard destined for recycling"),
  wc("030310", "fibre rejects, fibre-, filler- and coating-sludges from mechanical separation"),

  // ─── 04 — Leather, fur, textile ──────────────────────────────
  wc("040109", "wastes from dressing and finishing"),
  wc("040209", "wastes from composite materials (impregnated textile, elastomer, plastomer)"),
  wc("040210", "organic matter from natural products (for example grease, wax)"),
  wc("040221", "wastes from unprocessed textile fibres"),
  wc("040222", "wastes from processed textile fibres"),

  // ─── 05 — Petroleum refining ─────────────────────────────────
  wc("050102", "desalter sludges", { hazardous: true }),
  wc("050103", "tank bottom sludges", { hazardous: true }),
  wc("050115", "spent filter clays", { hazardous: true }),

  // ─── 06 — Inorganic chemicals ────────────────────────────────
  wc("060101", "sulphuric acid and sulphurous acid", { hazardous: true }),
  wc("060102", "hydrochloric acid", { hazardous: true }),
  wc("060106", "other acids", { hazardous: true }),
  wc("060205", "other bases", { hazardous: true }),
  wc("060404", "wastes containing mercury", { hazardous: true }),

  // ─── 07 — Organic chemicals ──────────────────────────────────
  wc("070104", "other organic solvents, washing liquids and mother liquors", { hazardous: true }),
  wc("070201", "aqueous washing liquids and mother liquors", { hazardous: true }),
  wc("070213", "waste plastic"),
  wc("070214", "wastes from additives containing dangerous substances", { hazardous: true, mirror: true }),
  wc("070215", "wastes from additives other than those mentioned in 07 02 14", { mirror: true }),

  // ─── 08 — Coatings, adhesives, sealants, inks ────────────────
  wc("080111", "waste paint and varnish containing organic solvents or other dangerous substances", { hazardous: true, mirror: true }),
  wc("080112", "waste paint and varnish other than those mentioned in 08 01 11", { mirror: true }),
  wc("080317", "waste printing toner containing dangerous substances", { hazardous: true, mirror: true }),
  wc("080318", "waste printing toner other than those mentioned in 08 03 17", { mirror: true }),
  wc("080409", "waste adhesives and sealants containing organic solvents or other dangerous substances", { hazardous: true, mirror: true }),
  wc("080410", "waste adhesives and sealants other than those mentioned in 08 04 09", { mirror: true }),

  // ─── 09 — Photographic industry ──────────────────────────────
  wc("090101", "water-based developer and activator solutions", { hazardous: true }),
  wc("090104", "fixer solutions", { hazardous: true }),
  wc("090107", "photographic film and paper containing silver or silver compounds"),

  // ─── 10 — Thermal processes ──────────────────────────────────
  wc("100101", "bottom ash, slag and boiler dust (excluding boiler dust mentioned in 10 01 04)"),
  wc("100102", "coal fly ash"),
  wc("100115", "bottom ash, slag and boiler dust from co-incineration other than those mentioned in 10 01 14", { mirror: true }),
  wc("100908", "casting cores and moulds which have undergone pouring other than those mentioned in 10 09 07", { mirror: true }),

  // ─── 11 — Metal surface treatment ────────────────────────────
  wc("110105", "pickling acids", { hazardous: true }),
  wc("110106", "acids not otherwise specified", { hazardous: true }),
  wc("110107", "pickling bases", { hazardous: true }),

  // ─── 12 — Shaping of metals & plastics ───────────────────────
  wc("120101", "ferrous metal filings and turnings"),
  wc("120102", "ferrous metal dust and particles"),
  wc("120103", "non-ferrous metal filings and turnings"),
  wc("120104", "non-ferrous metal dust and particles"),
  wc("120105", "plastics shavings and turnings"),
  wc("120109", "machining emulsions and solutions free of halogens", { hazardous: true }),
  wc("120113", "welding wastes"),

  // ─── 13 — Oil wastes (all hazardous) ─────────────────────────
  wc("130110", "mineral-based non-chlorinated hydraulic oils", { hazardous: true }),
  wc("130113", "other hydraulic oils", { hazardous: true }),
  wc("130205", "mineral-based non-chlorinated engine, gear and lubricating oils", { hazardous: true }),
  wc("130208", "other engine, gear and lubricating oils", { hazardous: true }),
  wc("130307", "mineral-based non-chlorinated insulating and heat transmission oils", { hazardous: true }),
  wc("130502", "sludges from oil/water separators", { hazardous: true }),
  wc("130703", "other fuels (including mixtures)", { hazardous: true }),

  // ─── 14 — Waste organic solvents (all hazardous) ─────────────
  wc("140602", "other halogenated solvents and solvent mixtures", { hazardous: true }),
  wc("140603", "other solvents and solvent mixtures", { hazardous: true }),
  wc("140604", "sludges or solid wastes containing halogenated solvents", { hazardous: true }),
  wc("140605", "sludges or solid wastes containing other solvents", { hazardous: true }),

  // ─── 15 — Packaging, absorbents, rags ────────────────────────
  wc("150101", "paper and cardboard packaging"),
  wc("150102", "plastic packaging"),
  wc("150103", "wooden packaging"),
  wc("150104", "metallic packaging"),
  wc("150105", "composite packaging"),
  wc("150106", "mixed packaging"),
  wc("150107", "glass packaging"),
  wc("150109", "textile packaging"),
  wc("150110", "packaging containing residues of or contaminated by dangerous substances", { hazardous: true }),
  wc("150111", "metallic packaging containing a dangerous solid porous matrix (for example asbestos), including empty pressure containers", { hazardous: true }),
  wc("150202", "absorbents, filter materials, wiping cloths and protective clothing contaminated by dangerous substances", { hazardous: true, mirror: true }),
  wc("150203", "absorbents, filter materials, wiping cloths and protective clothing other than those mentioned in 15 02 02", { mirror: true }),

  // ─── 16 — Not otherwise specified (WEEE, ELV, batteries) ─────
  wc("160103", "end-of-life tyres"),
  wc("160104", "end-of-life vehicles", { hazardous: true }),
  wc("160106", "end-of-life vehicles, containing neither liquids nor other hazardous components"),
  wc("160107", "oil filters", { hazardous: true }),
  wc("160117", "ferrous metal"),
  wc("160118", "non-ferrous metal"),
  wc("160119", "plastic"),
  wc("160120", "glass"),
  wc("160211", "discarded equipment containing chlorofluorocarbons, HCFC, HFC", { hazardous: true }),
  wc("160213", "discarded equipment containing hazardous components other than those mentioned in 16 02 09 to 16 02 12", { hazardous: true, mirror: true }),
  wc("160214", "discarded equipment other than those mentioned in 16 02 09 to 16 02 13", { mirror: true }),
  wc("160216", "components removed from discarded equipment other than those mentioned in 16 02 15"),
  wc("160504", "gases in pressure containers (including halons) containing dangerous substances", { hazardous: true }),
  wc("160601", "lead batteries", { hazardous: true }),
  wc("160602", "Ni-Cd batteries", { hazardous: true }),
  wc("160604", "alkaline batteries (except 16 06 03)"),
  wc("160605", "other batteries and accumulators"),

  // ─── 17 — Construction & Demolition ──────────────────────────
  wc("170101", "concrete"),
  wc("170102", "bricks"),
  wc("170103", "tiles and ceramics"),
  wc("170107", "mixtures of concrete, bricks, tiles and ceramics other than those mentioned in 17 01 06", { mirror: true }),
  wc("170201", "wood"),
  wc("170202", "glass"),
  wc("170203", "plastic"),
  wc("170204", "glass, plastic and wood containing or contaminated with dangerous substances", { hazardous: true }),
  wc("170302", "bituminous mixtures other than those mentioned in 17 03 01", { mirror: true }),
  wc("170401", "copper, bronze, brass"),
  wc("170402", "aluminium"),
  wc("170403", "lead"),
  wc("170405", "iron and steel"),
  wc("170407", "mixed metals"),
  wc("170411", "cables other than those mentioned in 17 04 10", { mirror: true }),
  wc("170504", "soil and stones other than those mentioned in 17 05 03", { mirror: true }),
  wc("170604", "insulation materials other than those mentioned in 17 06 01 and 17 06 03", { mirror: true }),
  wc("170605", "construction materials containing asbestos", { hazardous: true }),
  wc("170802", "gypsum-based construction materials other than those mentioned in 17 08 01", { mirror: true }),
  wc("170904", "mixed construction and demolition wastes other than those mentioned in 17 09 01, 17 09 02 and 17 09 03", { mirror: true }),

  // ─── 18 — Healthcare ─────────────────────────────────────────
  wc("180101", "sharps (except 18 01 03)"),
  wc("180102", "body parts and organs including blood bags and blood preserves (except 18 01 03)"),
  wc("180103", "wastes whose collection and disposal is subject to special requirements in order to prevent infection", { hazardous: true }),
  wc("180104", "wastes whose collection and disposal is not subject to special requirements in order to prevent infection"),
  wc("180106", "chemicals consisting of or containing dangerous substances", { hazardous: true, mirror: true }),
  wc("180108", "cytotoxic and cytostatic medicines", { hazardous: true }),
  wc("180109", "medicines other than those mentioned in 18 01 08"),

  // ─── 19 — Waste management facilities ────────────────────────
  wc("190102", "ferrous materials removed from bottom ash"),
  wc("190112", "bottom ash and slag other than those mentioned in 19 01 11", { mirror: true }),
  wc("190204", "premixed wastes composed of at least one hazardous waste", { hazardous: true }),
  wc("190503", "off-specification compost"),
  wc("190801", "screenings"),
  wc("190805", "sludges from treatment of urban waste water"),
  wc("191202", "ferrous metal"),
  wc("191203", "non-ferrous metal"),
  wc("191204", "plastic and rubber"),
  wc("191205", "glass"),
  wc("191207", "wood other than that mentioned in 19 12 06", { mirror: true }),
  wc("191208", "textiles"),
  wc("191210", "combustible waste (refuse-derived fuel)"),
  wc("191212", "other wastes (including mixtures of materials) from mechanical treatment of wastes other than those mentioned in 19 12 11", { mirror: true }),

  // ─── 20 — Municipal wastes ───────────────────────────────────
  wc("200101", "paper and cardboard"),
  wc("200102", "glass"),
  wc("200108", "biodegradable kitchen and canteen waste"),
  wc("200110", "clothes"),
  wc("200111", "textiles"),
  wc("200113", "solvents", { hazardous: true }),
  wc("200121", "fluorescent tubes and other mercury-containing waste", { hazardous: true }),
  wc("200123", "discarded equipment containing chlorofluorocarbons", { hazardous: true }),
  wc("200125", "edible oil and fat"),
  wc("200127", "paint, inks, adhesives and resins containing dangerous substances", { hazardous: true, mirror: true }),
  wc("200128", "paint, inks, adhesives and resins other than those mentioned in 20 01 27", { mirror: true }),
  wc("200133", "batteries and accumulators included in 16 06 01, 16 06 02 or 16 06 03 and unsorted batteries and accumulators containing these batteries", { hazardous: true }),
  wc("200134", "batteries and accumulators other than those mentioned in 20 01 33"),
  wc("200135", "discarded electrical and electronic equipment other than those mentioned in 20 01 21 and 20 01 23 containing hazardous components", { hazardous: true, mirror: true }),
  wc("200136", "discarded electrical and electronic equipment other than those mentioned in 20 01 21, 20 01 23 and 20 01 35", { mirror: true }),
  wc("200138", "wood other than that mentioned in 20 01 37", { mirror: true }),
  wc("200139", "plastics"),
  wc("200140", "metals"),
  wc("200201", "biodegradable waste"),
  wc("200202", "soil and stones"),
  wc("200301", "mixed municipal waste"),
  wc("200302", "waste from markets"),
  wc("200303", "street-cleaning residues"),
  wc("200307", "bulky waste"),
];

export { CATALOG_VERSION };
