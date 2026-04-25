// Default emission factors — seeded globally (companyId = null) for every
// tenant. Numbers sourced from DEFRA 2024 GHG conversion factors + EEA
// country electricity mix (2023). Companies can override per-activity
// later via the "Emission factor source" picker in the register forms.

export type EmissionFactorSeed = {
  category:
    | "FUEL"
    | "ELECTRICITY"
    | "WASTE_LANDFILL"
    | "WASTE_INCINERATION"
    | "WASTE_RECYCLING"
    | "WASTE_COMPOSTING"
    // Scope 3 — added with migration 0007.
    | "BUSINESS_TRAVEL"
    | "EMPLOYEE_COMMUTING"
    | "PURCHASED_GOODS"
    | "TRANSPORT";
  subtype: string;
  unit: string;
  kgCo2ePerUnit: number;
  source: string;
  region: string;
  year: number;
  notes?: string;
};

export const emissionFactors: EmissionFactorSeed[] = [
  // ─── Scope 1 — fuels ─────────────────────────────────────────
  { category: "FUEL", subtype: "diesel",         unit: "L",   kgCo2ePerUnit: 2.68779, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "petrol",         unit: "L",   kgCo2ePerUnit: 2.19664, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "natural_gas",    unit: "m3",  kgCo2ePerUnit: 2.02135, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Converted from kWh factor using 10.83 kWh/m3 calorific value." },
  { category: "FUEL", subtype: "natural_gas_kwh",unit: "kWh", kgCo2ePerUnit: 0.18316, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "lpg",            unit: "L",   kgCo2ePerUnit: 1.55713, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "heating_oil",    unit: "L",   kgCo2ePerUnit: 2.52390, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "coal",           unit: "kg",  kgCo2ePerUnit: 2.40244, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "FUEL", subtype: "biodiesel",      unit: "L",   kgCo2ePerUnit: 0.17000, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Well-to-tank only; combustion is biogenic." },
  { category: "FUEL", subtype: "wood_pellets",   unit: "kg",  kgCo2ePerUnit: 0.06000, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Biogenic combustion reported separately." },

  // ─── Scope 2 — electricity by country ────────────────────────
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.25300, source: "EEA 2023",   region: "EU",     year: 2023, notes: "EU-27 average electricity mix." },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.14000, source: "APA 2023",   region: "PT",     year: 2023 },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.19000, source: "MITECO 2023",region: "ES",     year: 2023 },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.06000, source: "ADEME 2023", region: "FR",     year: 2023 },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.37000, source: "UBA 2023",   region: "DE",     year: 2023 },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.18500, source: "BEIS 2023",  region: "UK",     year: 2023 },
  { category: "ELECTRICITY", subtype: "grid_electricity", unit: "kWh", kgCo2ePerUnit: 0.38300, source: "EPA 2023",   region: "US",     year: 2023 },

  // ─── Waste — per kg, common materials ────────────────────────
  // Sources: DEFRA 2024 + EPA WARM v15 + EEA waste stats.
  // Landfill numbers include methane emissions from anaerobic decomposition
  // where applicable (paper, wood, organics, textile). Recycling numbers
  // include only the processing footprint (avoided virgin-material
  // savings reported separately for completeness).

  // Plastic
  { category: "WASTE_LANDFILL",   subtype: "plastic", unit: "kg", kgCo2ePerUnit: 3.08,  source: "EPA WARM",  region: "GLOBAL", year: 2023, notes: "Composite LDPE/HDPE/PET landfill impact." },
  { category: "WASTE_INCINERATION",subtype: "plastic", unit: "kg", kgCo2ePerUnit: 2.70, source: "EPA WARM",  region: "GLOBAL", year: 2023 },
  { category: "WASTE_RECYCLING",  subtype: "plastic", unit: "kg", kgCo2ePerUnit: 0.51,  source: "EPA WARM",  region: "GLOBAL", year: 2023, notes: "Processing only; avoided virgin production omitted for conservative accounting." },

  // Paper & cardboard
  { category: "WASTE_LANDFILL",   subtype: "paper_cardboard", unit: "kg", kgCo2ePerUnit: 1.25, source: "EPA WARM", region: "GLOBAL", year: 2023, notes: "Methane from anaerobic decomp." },
  { category: "WASTE_INCINERATION",subtype: "paper_cardboard", unit: "kg", kgCo2ePerUnit: 0.04, source: "EPA WARM", region: "GLOBAL", year: 2023 },
  { category: "WASTE_RECYCLING",  subtype: "paper_cardboard", unit: "kg", kgCo2ePerUnit: 0.05, source: "EPA WARM", region: "GLOBAL", year: 2023 },
  { category: "WASTE_COMPOSTING", subtype: "paper_cardboard", unit: "kg", kgCo2ePerUnit: 0.02, source: "EPA WARM", region: "GLOBAL", year: 2023 },

  // Metal (ferrous proxy; non-ferrous similar order of magnitude)
  { category: "WASTE_LANDFILL",   subtype: "metal", unit: "kg", kgCo2ePerUnit: 0.02, source: "EPA WARM", region: "GLOBAL", year: 2023, notes: "Metals are inert in landfill." },
  { category: "WASTE_RECYCLING",  subtype: "metal", unit: "kg", kgCo2ePerUnit: 0.01, source: "EPA WARM", region: "GLOBAL", year: 2023 },

  // Glass
  { category: "WASTE_LANDFILL",   subtype: "glass", unit: "kg", kgCo2ePerUnit: 0.02, source: "EPA WARM", region: "GLOBAL", year: 2023 },
  { category: "WASTE_RECYCLING",  subtype: "glass", unit: "kg", kgCo2ePerUnit: 0.03, source: "EPA WARM", region: "GLOBAL", year: 2023 },

  // Wood
  { category: "WASTE_LANDFILL",   subtype: "wood", unit: "kg", kgCo2ePerUnit: 0.55, source: "EPA WARM", region: "GLOBAL", year: 2023 },
  { category: "WASTE_INCINERATION",subtype: "wood", unit: "kg", kgCo2ePerUnit: 0.05, source: "EPA WARM", region: "GLOBAL", year: 2023, notes: "Biogenic; combustion CO2 considered neutral." },
  { category: "WASTE_RECYCLING",  subtype: "wood", unit: "kg", kgCo2ePerUnit: 0.04, source: "EPA WARM", region: "GLOBAL", year: 2023 },

  // Organic / biowaste
  { category: "WASTE_LANDFILL",   subtype: "organic", unit: "kg", kgCo2ePerUnit: 0.80, source: "EPA WARM", region: "GLOBAL", year: 2023, notes: "Methane from food waste decomp." },
  { category: "WASTE_COMPOSTING", subtype: "organic", unit: "kg", kgCo2ePerUnit: 0.02, source: "EPA WARM", region: "GLOBAL", year: 2023 },

  // Textile
  { category: "WASTE_LANDFILL",   subtype: "textile", unit: "kg", kgCo2ePerUnit: 1.90, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_INCINERATION",subtype: "textile", unit: "kg", kgCo2ePerUnit: 1.80, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_RECYCLING",  subtype: "textile", unit: "kg", kgCo2ePerUnit: 0.10, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // Packaging (mixed) — fallback when material subtype unclear
  { category: "WASTE_LANDFILL",   subtype: "packaging", unit: "kg", kgCo2ePerUnit: 1.50, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_RECYCLING",  subtype: "packaging", unit: "kg", kgCo2ePerUnit: 0.15, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // Construction & demolition
  { category: "WASTE_LANDFILL",   subtype: "construction_demolition", unit: "kg", kgCo2ePerUnit: 0.02, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_RECYCLING",  subtype: "construction_demolition", unit: "kg", kgCo2ePerUnit: 0.01, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // WEEE (electronics)
  { category: "WASTE_LANDFILL",   subtype: "weee", unit: "kg", kgCo2ePerUnit: 0.50, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_RECYCLING",  subtype: "weee", unit: "kg", kgCo2ePerUnit: 0.10, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // Hazardous chemical / oil / healthcare — high landfill/incineration cost, low recycle
  { category: "WASTE_INCINERATION",subtype: "hazardous", unit: "kg", kgCo2ePerUnit: 2.80, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_LANDFILL",   subtype: "hazardous", unit: "kg", kgCo2ePerUnit: 1.20, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // Municipal / mixed — worst case fallback when nothing else matches
  { category: "WASTE_LANDFILL",   subtype: "municipal_mixed", unit: "kg", kgCo2ePerUnit: 0.47, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "WASTE_INCINERATION",subtype: "municipal_mixed", unit: "kg", kgCo2ePerUnit: 0.42, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // ─── Scope 3 — Business travel ───────────────────────────────
  // DEFRA 2024 GHG conversion factors (Table BT). All passenger.km values
  // are per single passenger; multiply by km × passengers in the form.
  // Hotel night uses the global commercial-accommodation average; tenants
  // with country detail can override.
  { category: "BUSINESS_TRAVEL", subtype: "air_short_haul",   unit: "pkm",   kgCo2ePerUnit: 0.15839, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Flights <3700km; economy avg." },
  { category: "BUSINESS_TRAVEL", subtype: "air_long_haul",    unit: "pkm",   kgCo2ePerUnit: 0.14981, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Flights >3700km; economy avg." },
  { category: "BUSINESS_TRAVEL", subtype: "air_domestic",     unit: "pkm",   kgCo2ePerUnit: 0.24587, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "BUSINESS_TRAVEL", subtype: "rail_national",    unit: "pkm",   kgCo2ePerUnit: 0.03694, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "BUSINESS_TRAVEL", subtype: "rail_international",unit: "pkm",  kgCo2ePerUnit: 0.00446, source: "DEFRA 2024", region: "EU",     year: 2024, notes: "Eurostar / TGV-style HSR mix." },
  { category: "BUSINESS_TRAVEL", subtype: "taxi_regular",     unit: "pkm",   kgCo2ePerUnit: 0.14758, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "BUSINESS_TRAVEL", subtype: "bus_coach",        unit: "pkm",   kgCo2ePerUnit: 0.02732, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "BUSINESS_TRAVEL", subtype: "car_petrol_avg",   unit: "km",    kgCo2ePerUnit: 0.16844, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Per vehicle.km, not per passenger.km. Petrol average car." },
  { category: "BUSINESS_TRAVEL", subtype: "car_diesel_avg",   unit: "km",    kgCo2ePerUnit: 0.16443, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Per vehicle.km. Diesel average car." },
  { category: "BUSINESS_TRAVEL", subtype: "hotel_night",      unit: "night", kgCo2ePerUnit: 10.4,    source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Commercial accommodation, global avg per occupied room-night." },

  // ─── Scope 3 — Employee commuting ────────────────────────────
  // Same factor magnitudes as business travel for shared modes; metro
  // factor is approximated from EU rail mix. walk + bicycle deliberately
  // omitted — the calc helper short-circuits those modes to zero so the
  // table doesn't carry placeholder rows.
  { category: "EMPLOYEE_COMMUTING", subtype: "car_petrol_avg", unit: "km",  kgCo2ePerUnit: 0.16844, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "EMPLOYEE_COMMUTING", subtype: "car_diesel_avg", unit: "km",  kgCo2ePerUnit: 0.16443, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "EMPLOYEE_COMMUTING", subtype: "bus_coach",      unit: "pkm", kgCo2ePerUnit: 0.02732, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "EMPLOYEE_COMMUTING", subtype: "rail_national",  unit: "pkm", kgCo2ePerUnit: 0.03694, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "EMPLOYEE_COMMUTING", subtype: "metro_subway",   unit: "pkm", kgCo2ePerUnit: 0.02780, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Light rail / metro / subway." },
  { category: "EMPLOYEE_COMMUTING", subtype: "scooter",        unit: "km",  kgCo2ePerUnit: 0.05823, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Petrol-powered motor scooter." },

  // ─── Scope 3 — Freight (Cat 4 + Cat 9) ───────────────────────
  // DEFRA 2024 freight conversion factors. Used by both UPSTREAM_TRANSPORT
  // and DOWNSTREAM_TRANSPORT — physics is direction-agnostic. Unit is t.km
  // (tonne-kilometre); the calc multiplies tonnes × distanceKm × factor.
  { category: "TRANSPORT", subtype: "truck_avg",            unit: "tkm", kgCo2ePerUnit: 0.10560, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "All HGVs, average load." },
  { category: "TRANSPORT", subtype: "truck_articulated",    unit: "tkm", kgCo2ePerUnit: 0.07900, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: ">17t articulated, average load." },
  { category: "TRANSPORT", subtype: "van_light",            unit: "tkm", kgCo2ePerUnit: 0.55000, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Class I/II light van; high per-tkm intensity." },
  { category: "TRANSPORT", subtype: "rail_freight",         unit: "tkm", kgCo2ePerUnit: 0.02200, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },
  { category: "TRANSPORT", subtype: "ship_container",       unit: "tkm", kgCo2ePerUnit: 0.01300, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "Container ship, average size." },
  { category: "TRANSPORT", subtype: "air_freight_long_haul",unit: "tkm", kgCo2ePerUnit: 0.60000, source: "DEFRA 2024", region: "GLOBAL", year: 2024, notes: "International air freight, long haul." },
  { category: "TRANSPORT", subtype: "inland_waterway",      unit: "tkm", kgCo2ePerUnit: 0.03000, source: "DEFRA 2024", region: "GLOBAL", year: 2024 },

  // ─── Scope 3 — Fuel & Energy related (WTT, Cat 3) ────────────
  // DEFRA 2024 well-to-tank conversion factors. Captures the upstream
  // supply-chain footprint *before* combustion (extraction, processing,
  // distribution losses). Subtype is prefixed `wtt_` to distinguish
  // from the Scope 1 direct-combustion factors with the same fuel name.
  { category: "FUEL",        subtype: "wtt_diesel",       unit: "L",   kgCo2ePerUnit: 0.60280, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "FUEL",        subtype: "wtt_petrol",       unit: "L",   kgCo2ePerUnit: 0.59000, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "FUEL",        subtype: "wtt_natural_gas",  unit: "m3",  kgCo2ePerUnit: 0.34010, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "FUEL",        subtype: "wtt_lpg",          unit: "L",   kgCo2ePerUnit: 0.18400, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "FUEL",        subtype: "wtt_heating_oil",  unit: "L",   kgCo2ePerUnit: 0.60900, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "FUEL",        subtype: "wtt_coal",         unit: "kg",  kgCo2ePerUnit: 0.13780, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024 },
  { category: "ELECTRICITY", subtype: "wtt_electricity",  unit: "kWh", kgCo2ePerUnit: 0.05070, source: "DEFRA 2024 WTT", region: "GLOBAL", year: 2024, notes: "Upstream + T&D losses combined." },
];
