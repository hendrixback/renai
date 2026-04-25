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
