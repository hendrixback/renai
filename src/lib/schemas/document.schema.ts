import { z } from "zod";

const DOCUMENT_MODULES = [
  "waste-flows",
  "scope-1",
  "scope-2",
  "scope-3",
  "production",
  "regulation",
  "account",
  "team",
] as const;

export const documentModuleSchema = z.enum(DOCUMENT_MODULES);
export type DocumentModule = z.infer<typeof documentModuleSchema>;

export const DOCUMENT_TYPES = [
  "INVOICE",
  "WASTE_CERTIFICATE",
  "COLLECTION_RECEIPT",
  "FUEL_BILL",
  "ELECTRICITY_BILL",
  "SUPPLIER_DOCUMENT",
  "INTERNAL_REPORT",
  "AUDIT_EVIDENCE",
  "ENVIRONMENTAL_LICENSE",
  "CONTRACT",
  "EMISSIONS_EVIDENCE",
  "PRODUCTION_REPORT",
  "REGULATORY_FILE",
  "OTHER",
] as const;

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;

/** Input to DocumentService.create — validated server-side. */
export const createDocumentSchema = z.object({
  originalFilename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(300, "Filename is too long"),
  mimeType: z.string().trim().min(1, "MIME type is required"),
  size: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(50 * 1024 * 1024, "File exceeds the 50MB maximum"),
  documentType: documentTypeSchema.default("OTHER"),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  plantId: z
    .string()
    .cuid()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  department: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  reportingYear: z.number().int().gte(2000).lte(2100).optional(),
  reportingMonth: z.number().int().gte(1).lte(12).optional(),
  /** Optional: auto-link to a record upon upload. */
  link: z
    .object({
      module: documentModuleSchema,
      recordId: z.string().min(1),
    })
    .optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const listDocumentsSchema = z.object({
  documentType: documentTypeSchema.optional(),
  plantId: z.string().cuid().optional(),
  reportingYear: z.number().int().optional(),
  module: documentModuleSchema.optional(),
  recordId: z.string().optional(),
  query: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;

export const linkDocumentSchema = z.object({
  documentId: z.string().cuid(),
  module: documentModuleSchema,
  recordId: z.string().min(1),
});

export type LinkDocumentInput = z.infer<typeof linkDocumentSchema>;
