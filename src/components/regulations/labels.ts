import type {
  RegulationPriorityValue,
  RegulationStatusValue,
  RegulationTopicValue,
  RegulationTypeValue,
} from "@/lib/schemas/regulation.schema";

/**
 * Display labels for the Regulation enums. Kept in one place so the
 * list, detail, filters, and form all stay in sync. Spec §16.7 + §16.8
 * dictate the canonical English labels.
 */

export const REGULATION_TYPE_LABELS: Record<RegulationTypeValue, string> = {
  EU_REGULATION: "EU Regulation",
  EU_DIRECTIVE: "EU Directive",
  NATIONAL_LAW: "National Law",
  NATIONAL_DECREE: "National Decree",
  GUIDANCE: "Guidance",
  REPORTING_STANDARD: "Reporting Standard",
  REGULATORY_UPDATE: "Regulatory Update",
  INTERNAL_COMPLIANCE_NOTE: "Internal Compliance Note",
  OTHER: "Other",
};

export const REGULATION_TOPIC_LABELS: Record<RegulationTopicValue, string> = {
  WASTE_MANAGEMENT: "Waste Management",
  CARBON_FOOTPRINT: "Carbon Footprint",
  GHG_REPORTING: "GHG Reporting",
  ESG_REPORTING: "ESG Reporting",
  ENERGY: "Energy",
  HAZARDOUS_WASTE: "Hazardous Waste",
  ENVIRONMENTAL_LICENSING: "Environmental Licensing",
  AUDIT_AND_DOCUMENTATION: "Audit & Documentation",
  INDUSTRIAL_COMPLIANCE: "Industrial Compliance",
  OTHER: "Other",
};

export const REGULATION_STATUS_LABELS: Record<RegulationStatusValue, string> = {
  PROPOSED: "Proposed",
  IN_FORCE: "In force",
  SUPERSEDED: "Superseded",
  REPEALED: "Repealed",
};

export const REGULATION_PRIORITY_LABELS: Record<RegulationPriorityValue, string> =
  {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };

/** Common geography quick-picks. Free-text remains supported. */
export const GEOGRAPHY_SUGGESTIONS = [
  "EU",
  "GLOBAL",
  "PT",
  "ES",
  "FR",
  "DE",
  "UK",
  "US",
  "INTERNATIONAL",
] as const;

/** Tone for the priority badge — maps to existing badge variants. */
export function priorityVariant(
  p: RegulationPriorityValue,
): "default" | "secondary" | "outline" | "destructive" {
  switch (p) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "default";
    case "MEDIUM":
      return "secondary";
    case "LOW":
      return "outline";
  }
}

/** Tone for the regulatory-status badge. */
export function statusVariant(
  s: RegulationStatusValue,
): "default" | "secondary" | "outline" | "destructive" {
  switch (s) {
    case "IN_FORCE":
      return "default";
    case "PROPOSED":
      return "secondary";
    case "SUPERSEDED":
      return "outline";
    case "REPEALED":
      return "destructive";
  }
}
