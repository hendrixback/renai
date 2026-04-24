import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DocumentService } from "@/lib/services/documents";
import { StorageError } from "@/lib/storage";

/**
 * Authenticated file download.
 *
 * GET /documentation/[id]/download
 *
 * Every request:
 *  1. Resolves the current context (rejects unauthenticated).
 *  2. DocumentService.openReadStream enforces tenant ownership of the
 *     Document row AND the storage key — two guards, defence in depth
 *     against a forged document id.
 *  3. Streams bytes back with a Content-Disposition header so the browser
 *     triggers a save dialog. Cache-Control: private, no-store keeps
 *     proxies from holding customer-scoped files.
 *  4. Emits a DOCUMENT_DOWNLOADED activity log entry — one audit row per
 *     successful download is the expected granularity for compliance.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const ctx = await getCurrentContext();
  if (!ctx) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { document, stream } = await DocumentService.openReadStream(ctx, id);

    await logActivity(ctx, {
      type: "DOCUMENT_DOWNLOADED",
      module: "documentation",
      recordId: document.id,
      description: `Downloaded "${document.originalFilename}"`,
      metadata: {
        documentId: document.id,
        size: document.size,
      },
    });

    // Normalise the filename for Content-Disposition. Browsers get a
    // UTF-8 value via RFC 5987 (filename*=) and a safe ASCII fallback.
    const encodedFilename = encodeURIComponent(document.originalFilename);
    const asciiFilename = document.originalFilename.replace(/[^\x20-\x7e]/g, "_");

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": document.mimeType,
        "content-length": String(document.size),
        "content-disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof StorageError && err.code === "not_found") {
      return new NextResponse("Not found", { status: 404 });
    }
    if (err instanceof StorageError && err.code === "tenant_mismatch") {
      // Return 404 rather than 403 — don't confirm that the id exists in
      // a different tenant. Looks identical to "not a real document" from
      // the caller's POV.
      return new NextResponse("Not found", { status: 404 });
    }
    logger.error("Document download failed", err, {
      companyId: ctx.company.id,
      documentId: id,
    });
    return new NextResponse("Error", { status: 500 });
  }
}
