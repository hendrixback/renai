import { z } from "zod";

/**
 * ProductionVolume register / update payload. Validated server-side at
 * write time (Atlas-pattern dialog passes a plain object, not FormData).
 */
export const registerProductionVolumeSchema = z.object({
  productLabel: z
    .string()
    .trim()
    .min(1, "Product / line label is required")
    .max(120),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  volume: z.number().positive(),
  unit: z.string().trim().min(1).max(20),
  siteId: z.string().cuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RegisterProductionVolumeInput = z.infer<
  typeof registerProductionVolumeSchema
>;

/** A small set of common output units for the form select. Free text
 *  also allowed via the dialog so tenants with bespoke units aren't
 *  blocked. */
export const COMMON_PRODUCTION_UNITS = [
  "ton",
  "kg",
  "piece",
  "unit",
  "m³",
  "L",
  "kWh",
  "MWh",
] as const;
