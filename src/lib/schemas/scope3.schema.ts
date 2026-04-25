import { z } from "zod";

/**
 * Per-Scope3-category payload schemas. Persisted in `Scope3Entry.categoryData`
 * (JSONB) and validated server-side at write time. Discriminated by the
 * `category` field on the parent record so each shape is type-safe.
 *
 * In MVP we ship BUSINESS_TRAVEL fully; the other 6 categories are stubs
 * (raw `description + amount + unit` shape) so the table can hold any
 * category right away while the dedicated forms ship in follow-ups.
 */

export const SCOPE3_CATEGORIES = [
  "PURCHASED_GOODS_SERVICES",
  "FUEL_ENERGY_RELATED",
  "UPSTREAM_TRANSPORT",
  "WASTE_GENERATED",
  "BUSINESS_TRAVEL",
  "EMPLOYEE_COMMUTING",
  "DOWNSTREAM_TRANSPORT",
] as const;
export const scope3CategorySchema = z.enum(SCOPE3_CATEGORIES);
export type Scope3CategoryValue = z.infer<typeof scope3CategorySchema>;

export const BUSINESS_TRAVEL_MODES = [
  "air_short_haul",
  "air_long_haul",
  "air_domestic",
  "rail_national",
  "rail_international",
  "taxi_regular",
  "bus_coach",
  "car_petrol_avg",
  "car_diesel_avg",
  "hotel_night",
] as const;
export const businessTravelModeSchema = z.enum(BUSINESS_TRAVEL_MODES);
export type BusinessTravelMode = z.infer<typeof businessTravelModeSchema>;

/**
 * BUSINESS_TRAVEL payload. The activity input depends on the mode:
 *  - travel modes: distanceKm + passengers (defaults to 1)
 *  - hotel_night: nights only (passengers/distance ignored)
 */
export const businessTravelDataSchema = z
  .object({
    mode: businessTravelModeSchema,
    distanceKm: z.number().positive().optional(),
    passengers: z.number().int().positive().default(1),
    nights: z.number().int().positive().optional(),
    region: z.string().min(2).max(8).default("GLOBAL"),
    origin: z.string().trim().max(120).optional(),
    destination: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "hotel_night") {
      if (!data.nights) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nights"],
          message: "Number of nights is required for hotel stays.",
        });
      }
    } else if (!data.distanceKm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["distanceKm"],
        message: "Distance (km) is required for travel modes.",
      });
    }
  });
export type BusinessTravelData = z.infer<typeof businessTravelDataSchema>;

/**
 * Stub payload for the not-yet-shipped categories — we still want the
 * table to accept entries for them so customers can record manually-
 * computed totals while we build the dedicated forms.
 */
export const genericScope3DataSchema = z.object({
  amount: z.number().positive().optional(),
  unit: z.string().trim().max(40).optional(),
  /** Pre-computed kgCO₂e when the user has their own number. Bypasses
   *  the factor lookup. */
  kgCo2eOverride: z.number().nonnegative().optional(),
});
export type GenericScope3Data = z.infer<typeof genericScope3DataSchema>;

export const EMPLOYEE_COMMUTING_MODES = [
  "car_petrol_avg",
  "car_diesel_avg",
  "bus_coach",
  "rail_national",
  "metro_subway",
  "bicycle",
  "walk",
  "scooter",
] as const;
export const employeeCommutingModeSchema = z.enum(EMPLOYEE_COMMUTING_MODES);
export type EmployeeCommutingMode = z.infer<typeof employeeCommutingModeSchema>;

export const FREIGHT_MODES = [
  "truck_avg",
  "truck_articulated",
  "van_light",
  "rail_freight",
  "ship_container",
  "air_freight_long_haul",
  "inland_waterway",
] as const;
export const freightModeSchema = z.enum(FREIGHT_MODES);
export type FreightMode = z.infer<typeof freightModeSchema>;

/**
 * Freight payload — used by both UPSTREAM_TRANSPORT (Cat 4) and
 * DOWNSTREAM_TRANSPORT (Cat 9). Activity = tonnes × distanceKm × factor;
 * direction (up/down) is captured by the parent Scope3Entry.category
 * field, since the underlying physics + factors are direction-agnostic.
 */
export const freightDataSchema = z.object({
  mode: freightModeSchema,
  tonnes: z.number().positive(),
  distanceKm: z.number().positive(),
  region: z.string().min(2).max(8).default("GLOBAL"),
  origin: z.string().trim().max(120).optional(),
  destination: z.string().trim().max(120).optional(),
});
export type FreightData = z.infer<typeof freightDataSchema>;

/**
 * WASTE_GENERATED payload (Cat 5). Per Amendment A3 we don't duplicate
 * waste data — instead the entry references an existing WasteFlow and
 * the kgCO₂e is snapshotted from computeWasteImpact at write time.
 * The user picks a flow + a reporting month; we re-resolve the impact
 * on every save so historical entries stay stable even if the source
 * flow is later edited.
 */
export const wasteGeneratedDataSchema = z.object({
  wasteFlowId: z.string().cuid(),
  /** Snapshotted at write time so the entry doesn't drift when the flow changes. */
  wasteFlowName: z.string().trim().max(200).optional(),
});
export type WasteGeneratedData = z.infer<typeof wasteGeneratedDataSchema>;

/**
 * FUEL_ENERGY_RELATED (Cat 3) covers well-to-tank (WTT) emissions —
 * the upstream supply-chain footprint of fuels + electricity *before*
 * combustion / consumption. Subtypes are prefixed `wtt_` so they sit
 * alongside the direct-combustion factors in the same EmissionFactor
 * table without colliding.
 */
export const FUEL_ENERGY_SUBTYPES = [
  "wtt_diesel",
  "wtt_petrol",
  "wtt_natural_gas",
  "wtt_lpg",
  "wtt_heating_oil",
  "wtt_coal",
  "wtt_electricity",
] as const;
export const fuelEnergySubtypeSchema = z.enum(FUEL_ENERGY_SUBTYPES);
export type FuelEnergySubtype = z.infer<typeof fuelEnergySubtypeSchema>;

export const fuelEnergyDataSchema = z.object({
  subtype: fuelEnergySubtypeSchema,
  quantity: z.number().positive(),
  /** Unit of the quantity (informational; the factor's unit governs the calc). */
  unit: z.string().trim().max(8),
  region: z.string().min(2).max(8).default("GLOBAL"),
});
export type FuelEnergyData = z.infer<typeof fuelEnergyDataSchema>;

/**
 * PURCHASED_GOODS_SERVICES (Cat 1) — spend-based MVP. Activity is the
 * EUR spent in a given industry sector × the sector's average emission
 * intensity (EXIOBASE-derived approximations, refined per tenant via
 * company-specific factor overrides).
 *
 * Sectors aligned (loosely) to NACE Rev.2 high-level groupings — kept
 * intentionally short for the form. Tenants who need finer granularity
 * upload their own factor table.
 */
export const PURCHASED_GOODS_SECTORS = [
  "food_beverage_tobacco",
  "textile_apparel",
  "chemicals_plastics",
  "metals_basic",
  "machinery_equipment",
  "construction",
  "electronics",
  "pharmaceuticals",
  "transport_services",
  "professional_services",
  "it_services",
  "admin_services",
  "utilities",
  "retail_wholesale",
  "other_manufacturing",
  "other_services",
] as const;
export const purchasedGoodsSectorSchema = z.enum(PURCHASED_GOODS_SECTORS);
export type PurchasedGoodsSector = z.infer<typeof purchasedGoodsSectorSchema>;

export const purchasedGoodsDataSchema = z.object({
  sector: purchasedGoodsSectorSchema,
  spendEur: z.number().positive(),
  supplier: z.string().trim().max(120).optional(),
  region: z.string().min(2).max(8).default("GLOBAL"),
});
export type PurchasedGoodsData = z.infer<typeof purchasedGoodsDataSchema>;

/**
 * EMPLOYEE_COMMUTING payload (GHG Protocol Cat 7).
 * Activity-based: distance per day × days per year × employees → annual
 * pkm or vehicle.km, multiplied by the matching factor.
 *
 * Defaults assume one employee × the typical European working year
 * (220 days) — keeping the form short for the common case.
 */
export const employeeCommutingDataSchema = z.object({
  mode: employeeCommutingModeSchema,
  /** Round-trip commute distance per day, in km. */
  distancePerDayKm: z.number().positive(),
  /** Working days per year (defaults to 220). */
  daysPerYear: z.number().int().positive().max(365).default(220),
  /** Number of employees this entry represents. */
  employees: z.number().int().positive().default(1),
  region: z.string().min(2).max(8).default("GLOBAL"),
});
export type EmployeeCommutingData = z.infer<typeof employeeCommutingDataSchema>;

/**
 * Top-level register payload. Discriminated on `category` so per-category
 * shape is enforced.
 */
export const registerScope3Schema = z
  .object({
    category: scope3CategorySchema,
    description: z.string().trim().min(1, "Description is required").max(200),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
    siteId: z.string().cuid().optional(),
    notes: z.string().trim().max(2000).optional(),
    data: z.unknown(),
  })
  .superRefine((value, ctx) => {
    let parsed;
    if (value.category === "BUSINESS_TRAVEL") {
      parsed = businessTravelDataSchema.safeParse(value.data);
    } else if (value.category === "EMPLOYEE_COMMUTING") {
      parsed = employeeCommutingDataSchema.safeParse(value.data);
    } else if (
      value.category === "UPSTREAM_TRANSPORT" ||
      value.category === "DOWNSTREAM_TRANSPORT"
    ) {
      parsed = freightDataSchema.safeParse(value.data);
    } else if (value.category === "WASTE_GENERATED") {
      parsed = wasteGeneratedDataSchema.safeParse(value.data);
    } else if (value.category === "FUEL_ENERGY_RELATED") {
      parsed = fuelEnergyDataSchema.safeParse(value.data);
    } else if (value.category === "PURCHASED_GOODS_SERVICES") {
      parsed = purchasedGoodsDataSchema.safeParse(value.data);
    } else {
      parsed = genericScope3DataSchema.safeParse(value.data);
    }
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ["data", ...(issue.path ?? [])] });
      }
    }
  });
export type RegisterScope3Input = z.infer<typeof registerScope3Schema>;
