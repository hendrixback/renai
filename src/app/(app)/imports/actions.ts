"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { autoMap, validate } from "@/lib/imports/engine";
import { parseFile } from "@/lib/imports/parser";
import { getImportConfig, isImportModule } from "@/lib/imports/configs/registry";
import type { ColumnMap } from "@/lib/imports/types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getStorage, StorageError } from "@/lib/storage";

export type UploadState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
};

const NO_PERMISSION = "Only Admins and Collaborators can import data.";

const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024; // 25MB — generous for CSV/XLSX, well below the 50MB document cap

const ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/x-csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

/**
 * Step 1: receive the uploaded file, persist it to storage, parse for
 * headers + row count, and create an ImportSession in PARSED state.
 * Returns by redirecting to the column-mapping page.
 */
export async function uploadImportFile(
  module: string,
  _prev: UploadState | null,
  formData: FormData,
): Promise<UploadState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { error: "Not authenticated", fieldErrors: {} };

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: NO_PERMISSION, fieldErrors: {} };
    }
    throw err;
  }

  if (!isImportModule(module)) {
    return { error: "Unknown import module", fieldErrors: {} };
  }
  const config = getImportConfig(module)!;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: null,
      fieldErrors: { file: ["Please choose a CSV or XLSX file."] },
    };
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return {
      error: null,
      fieldErrors: {
        file: [
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB.`,
        ],
      },
    };
  }
  // MIME check is best-effort — browsers/OSes fill this in unreliably.
  // The parser is the actual authority on whether the file is valid.
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type)) {
    logger.warn("Import upload with unrecognised MIME — accepting on filename", {
      mime: file.type,
      filename: file.name,
    });
  }

  const sessionId = createId();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse first so we can fail fast before persisting a broken file.
  let parsed;
  try {
    parsed = await parseFile(file.name, file.type ?? "text/csv", buffer);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "File parse failed",
      fieldErrors: {},
    };
  }

  // Persist the file (so the user can re-validate after column-map
  // changes without re-uploading).
  let storageKey: string;
  try {
    const upload = await getStorage().upload({
      companyId: ctx.company.id,
      documentId: sessionId, // reuse the session id as the storage key seed
      filename: file.name,
      mimeType: file.type || "text/csv",
      data: buffer,
    });
    storageKey = upload.storageKey;
  } catch (err) {
    if (err instanceof StorageError) {
      return { error: `Storage error: ${err.message}`, fieldErrors: {} };
    }
    throw err;
  }

  const autoMapped = autoMap(parsed.headers, config);

  await prisma.importSession.create({
    data: {
      id: sessionId,
      companyId: ctx.company.id,
      uploadedById: ctx.user.id,
      module,
      filename: file.name,
      storageKey,
      fileSize: file.size,
      mimeType: file.type || "text/csv",
      status: "PARSED",
      headers: parsed.headers,
      columnMap: autoMapped as object,
      totalRows: parsed.rows.length,
    },
  });

  logger.info("Import session started", {
    event: "import.uploaded",
    sessionId,
    module,
    rows: parsed.rows.length,
    companyId: ctx.company.id,
  });

  redirect(`/imports/sessions/${sessionId}/map`);
}

/**
 * Step 2: user confirms / edits the column map. We persist it on the
 * session row + run validation eagerly so the preview page renders
 * instantly. Status moves to VALIDATED.
 */
export async function confirmColumnMap(
  sessionId: string,
  columnMap: ColumnMap,
): Promise<{ error: string | null }> {
  const ctx = await getCurrentContext();
  if (!ctx) return { error: "Not authenticated" };

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: NO_PERMISSION };
    throw err;
  }

  const session = await prisma.importSession.findFirst({
    where: { id: sessionId, companyId: ctx.company.id },
  });
  if (!session) return { error: "Session not found" };

  const config = getImportConfig(session.module);
  if (!config) return { error: "Unknown module" };

  // Re-parse the file from storage and run validation with the new
  // map. This is fast for small files and correct under refresh.
  const stream = await getStorage().read(ctx.company.id, session.storageKey);
  const buffer = await streamToBuffer(stream);
  const parsed = await parseFile(session.filename, session.mimeType, buffer);
  const result = validate(parsed, config, columnMap);

  await prisma.importSession.update({
    where: { id: session.id },
    data: {
      status: "VALIDATED",
      columnMap: columnMap as object,
      totalRows: parsed.rows.length,
      validRows: result.valid.length,
      errorRows: result.errors.length,
      errorReport: result.errors as unknown as object,
    },
  });

  revalidatePath(`/imports/sessions/${session.id}`);
  redirect(`/imports/sessions/${session.id}/preview`);
}

/**
 * Step 3: commit valid rows. Re-parses + re-validates as a guard
 * against the file being tampered with between map and commit. The
 * config's commit function does the actual writes; we record the
 * outcome on the session row.
 */
export async function commitImportSession(
  sessionId: string,
): Promise<{ error: string | null; committedCount?: number; redirect?: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) return { error: "Not authenticated" };

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: NO_PERMISSION };
    throw err;
  }

  const session = await prisma.importSession.findFirst({
    where: { id: sessionId, companyId: ctx.company.id },
  });
  if (!session) return { error: "Session not found" };
  if (session.status === "COMMITTED") {
    return {
      error: "This import has already been committed.",
      committedCount: session.committedRows,
    };
  }
  if (!session.columnMap) {
    return { error: "Confirm the column mapping first." };
  }

  const config = getImportConfig(session.module);
  if (!config) return { error: "Unknown module" };

  await prisma.importSession.update({
    where: { id: session.id },
    data: { status: "COMMITTING" },
  });

  try {
    const stream = await getStorage().read(ctx.company.id, session.storageKey);
    const buffer = await streamToBuffer(stream);
    const parsed = await parseFile(session.filename, session.mimeType, buffer);
    const result = validate(parsed, config, session.columnMap as ColumnMap);

    const outcome = await config.commit(ctx, result.valid);

    await prisma.importSession.update({
      where: { id: session.id },
      data: {
        status: outcome.errors.length > 0 && outcome.committed === 0 ? "FAILED" : "COMMITTED",
        committedRows: outcome.committed,
        errorRows: result.errors.length + outcome.errors.length,
        errorReport: [...result.errors, ...outcome.errors] as unknown as object,
      },
    });

    await logActivity(ctx, {
      type: "RECORD_CREATED",
      module: "imports",
      recordId: session.id,
      description: `Committed import: ${outcome.committed} row${outcome.committed === 1 ? "" : "s"} into ${config.label}`,
      metadata: {
        importModule: session.module,
        committed: outcome.committed,
        errors: outcome.errors.length,
        filename: session.filename,
      },
    });

    revalidatePath(`/imports/sessions/${session.id}`);
    return {
      error: null,
      committedCount: outcome.committed,
      redirect: config.redirectAfterCommit,
    };
  } catch (err) {
    logger.error("Import commit failed", err, { sessionId });
    await prisma.importSession.update({
      where: { id: session.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return {
      error: `Commit failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

export async function cancelImportSession(sessionId: string): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const session = await prisma.importSession.findFirst({
    where: { id: sessionId, companyId: ctx.company.id },
    select: { id: true, status: true },
  });
  if (!session) return;
  if (session.status === "COMMITTED") return;

  await prisma.importSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/imports");
}

/** Read a Web ReadableStream<Uint8Array> into a Node Buffer. */
async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}
