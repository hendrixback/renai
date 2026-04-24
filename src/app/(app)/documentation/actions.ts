"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import {
  createDocumentSchema,
  documentModuleSchema,
  type DocumentModule,
} from "@/lib/schemas/document.schema";
import { DocumentService } from "@/lib/services/documents";
import { StorageError } from "@/lib/storage";

export type UploadDocumentState = {
  error: string | null;
  success: string | null;
  documentId: string | null;
  fieldErrors: Record<string, string[]>;
};

const EMPTY_STATE: UploadDocumentState = {
  error: null,
  success: null,
  documentId: null,
  fieldErrors: {},
};

const PERMISSION_DENIED = "You don't have permission to manage documents.";

function numberOrUndef(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function stringOrUndef(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Where to revalidate when a document is attached to a record in that module.
 * Keeps the "Recent attachments" view on record detail pages fresh.
 */
function pathForModule(module: DocumentModule): string {
  switch (module) {
    case "waste-flows":
      return "/waste-flows";
    case "scope-1":
      return "/carbon-footprint/fuel";
    case "scope-2":
      return "/carbon-footprint/electricity";
    case "scope-3":
      return "/carbon-footprint/value-chain";
    case "production":
      return "/carbon-footprint/production";
    case "regulation":
      return "/regulations";
    case "account":
      return "/settings/account";
    case "team":
      return "/team-overview";
    default:
      return "/documentation";
  }
}

export async function uploadDocument(
  _prev: UploadDocumentState | null,
  formData: FormData,
): Promise<UploadDocumentState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...EMPTY_STATE, error: "Not authenticated" };

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ...EMPTY_STATE, error: PERMISSION_DENIED };
    }
    throw err;
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ...EMPTY_STATE,
      fieldErrors: { file: ["Please select a file to upload."] },
    };
  }
  if (file.size === 0) {
    return {
      ...EMPTY_STATE,
      fieldErrors: { file: ["The selected file is empty."] },
    };
  }

  // Optional auto-link: when the upload is initiated from a record's
  // "attach document" button, link it back to that record atomically.
  let link: { module: DocumentModule; recordId: string } | undefined;
  const rawLinkModule = formData.get("linkModule");
  const rawLinkRecordId = formData.get("linkRecordId");
  if (
    typeof rawLinkModule === "string" &&
    rawLinkModule &&
    typeof rawLinkRecordId === "string" &&
    rawLinkRecordId
  ) {
    const parsedModule = documentModuleSchema.safeParse(rawLinkModule);
    if (!parsedModule.success) {
      return {
        ...EMPTY_STATE,
        error: "Invalid link target module.",
      };
    }
    link = { module: parsedModule.data, recordId: rawLinkRecordId };
  }

  const tags = formData
    .getAll("tags")
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());

  const parsed = createDocumentSchema.safeParse({
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    documentType: stringOrUndef(formData.get("documentType")),
    title: stringOrUndef(formData.get("title")),
    description: stringOrUndef(formData.get("description")),
    tags,
    plantId: stringOrUndef(formData.get("plantId")),
    department: stringOrUndef(formData.get("department")),
    reportingYear: numberOrUndef(formData.get("reportingYear")),
    reportingMonth: numberOrUndef(formData.get("reportingMonth")),
    link,
  });

  if (!parsed.success) {
    return {
      ...EMPTY_STATE,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await DocumentService.create(ctx, {
      ...parsed.data,
      data: buffer,
    });

    await logActivity(ctx, {
      type: "DOCUMENT_UPLOADED",
      module: link?.module ?? "documentation",
      recordId: link?.recordId ?? doc.id,
      description: `Uploaded "${doc.originalFilename}"`,
      metadata: {
        documentId: doc.id,
        size: doc.size,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
      },
    });
  } catch (err) {
    if (err instanceof StorageError) {
      if (err.code === "file_too_large") {
        return {
          ...EMPTY_STATE,
          fieldErrors: { file: ["File exceeds the 50MB limit."] },
        };
      }
      if (err.code === "unsupported_mime") {
        return {
          ...EMPTY_STATE,
          fieldErrors: {
            file: [`File type "${file.type || "unknown"}" is not allowed.`],
          },
        };
      }
    }
    logger.error("Document upload failed", err, {
      companyId: ctx.company.id,
      userId: ctx.user.id,
      filename: file.name,
    });
    return {
      ...EMPTY_STATE,
      error: "Upload failed. Please try again.",
    };
  }

  revalidatePath("/documentation");
  if (link) revalidatePath(pathForModule(link.module));

  // redirectTo, when present and safe, takes precedence — lets callers
  // bring the user back to a specific record page instead of a module root.
  const rawRedirect = formData.get("redirectTo");
  const safeRedirect =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  redirect(
    safeRedirect ?? (link ? pathForModule(link.module) : "/documentation"),
  );
}

export async function deleteDocument(documentId: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const doc = await DocumentService.softDelete(ctx, documentId);
  if (!doc) return;

  await logActivity(ctx, {
    type: "DOCUMENT_DELETED",
    module: "documentation",
    recordId: doc.id,
    description: `Deleted "${doc.originalFilename}"`,
    metadata: {
      documentId: doc.id,
      originalFilename: doc.originalFilename,
    },
  });

  revalidatePath("/documentation");
}
