import { z } from "zod";

/**
 * Regulation Zod schemas — single source of truth for create/update
 * payloads. Per ADR-008 these are imported by both the server action
 * (final enforcement) and any client-side preview (live validation).
 *
 * The enums are mirrored from the Prisma schema. Keep them in sync —
 * Prisma's generated types are the authority but Zod can't import them
 * directly without a ref-cycle, so we re-declare and rely on TS to
 * complain if they drift.
 */

export const REGULATION_TYPES = [
  "EU_REGULATION",
  "EU_DIRECTIVE",
  "NATIONAL_LAW",
  "NATIONAL_DECREE",
  "GUIDANCE",
  "REPORTING_STANDARD",
  "REGULATORY_UPDATE",
  "INTERNAL_COMPLIANCE_NOTE",
  "OTHER",
] as const;
export type RegulationTypeValue = (typeof REGULATION_TYPES)[number];

export const REGULATION_TOPICS = [
  "WASTE_MANAGEMENT",
  "CARBON_FOOTPRINT",
  "GHG_REPORTING",
  "ESG_REPORTING",
  "ENERGY",
  "HAZARDOUS_WASTE",
  "ENVIRONMENTAL_LICENSING",
  "AUDIT_AND_DOCUMENTATION",
  "INDUSTRIAL_COMPLIANCE",
  "OTHER",
] as const;
export type RegulationTopicValue = (typeof REGULATION_TOPICS)[number];

export const REGULATION_STATUSES = [
  "PROPOSED",
  "IN_FORCE",
  "SUPERSEDED",
  "REPEALED",
] as const;
export type RegulationStatusValue = (typeof REGULATION_STATUSES)[number];

export const REGULATION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RegulationPriorityValue = (typeof REGULATION_PRIORITIES)[number];

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalDate = z.preprocess((v) => {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const trimmedString = (max: number) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

/**
 * Geography — free-text VARCHAR(40). Common values: "EU", "PT", "ES",
 * country codes (ISO 3166-1 alpha-2), or region labels like "PT-Norte".
 * Trim + uppercase for consistency, leave validation to the form's
 * dropdown of common values + free-text fallback.
 */
const geographySchema = z
  .string()
  .trim()
  .min(2, "Geography is required (e.g. EU, PT)")
  .max(40);

export const createRegulationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(REGULATION_TYPES),
  geography: geographySchema,
  topic: z.enum(REGULATION_TOPICS),
  summary: z.string().trim().min(1, "Summary is required").max(5000),
  sourceReference: trimmedString(500),
  effectiveDate: optionalDate,
  regulatoryStatus: z.enum(REGULATION_STATUSES).default("IN_FORCE"),
  appliesToUs: z.preprocess((v) => {
    // Form data: "on" / "true" / boolean
    if (typeof v === "boolean") return v;
    if (v === "on" || v === "true") return true;
    return false;
  }, z.boolean().default(false)),
  priorityLevel: z.enum(REGULATION_PRIORITIES).default("MEDIUM"),
  internalNotes: trimmedString(5000),
  reviewedById: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  reviewDate: optionalDate,
});
export type CreateRegulationInput = z.infer<typeof createRegulationSchema>;

export const updateRegulationSchema = createRegulationSchema;
export type UpdateRegulationInput = z.infer<typeof updateRegulationSchema>;

/**
 * List/filter params accepted by the index page. All optional; empty
 * string is treated as "no filter".
 */
export const listRegulationsParamsSchema = z.object({
  q: z.string().optional(),
  type: z.enum(REGULATION_TYPES).optional(),
  topic: z.enum(REGULATION_TOPICS).optional(),
  geography: z.string().optional(),
  appliesToUs: z.enum(["true", "false"]).optional(),
  regulatoryStatus: z.enum(REGULATION_STATUSES).optional(),
  priorityLevel: z.enum(REGULATION_PRIORITIES).optional(),
});
export type ListRegulationsParams = z.infer<typeof listRegulationsParamsSchema>;
