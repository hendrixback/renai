import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DocumentService } from "@/lib/services/documents";
import { StorageError } from "@/lib/storage";

/**
 * Authenticated file download / inline view.
 *
 * GET /documentation/[id]/download
 * GET /documentation/[id]/download?inline=1   → Content-Disposition: inline
 *
 * Every request:
 *  1. Resolves the current context (rejects unauthenticated).
 *  2. DocumentService.openReadStream enforces tenant ownership of the
 *     Document row AND the storage key — two guards, defence in depth
 *     against a forged document id.
 *  3. Streams bytes back. Download (default) forces a save dialog;
 *     inline lets the browser render PDFs/images within the page
 *     (used by the preview component on the detail page).
 *  4. Emits DOCUMENT_DOWNLOADED only for actual downloads, not inline
 *     previews (preview events would flood the audit log as the same
 *     user opens a doc many times while reviewing).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const ctx = await getCurrentContext();
  if (!ctx) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { document, stream } = await DocumentService.openReadStream(ctx, id);

    if (!inline) {
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
    }

    // RFC 5987 Content-Disposition so unicode filenames survive.
    const encodedFilename = encodeURIComponent(document.originalFilename);
    const asciiFilename = document.originalFilename.replace(/[^\x20-\x7e]/g, "_");
    const disposition = inline ? "inline" : "attachment";

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": document.mimeType,
        "content-length": String(document.size),
        "content-disposition": `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof StorageError && err.code === "not_found") {
      return new NextResponse("Not found", { status: 404 });
    }
    if (err instanceof StorageError && err.code === "tenant_mismatch") {
      // Return 404 rather than 403 — don't confirm another tenant's doc exists.
      return new NextResponse("Not found", { status: 404 });
    }
    logger.error("Document download failed", err, {
      companyId: ctx.company.id,
      documentId: id,
    });
    return new NextResponse("Error", { status: 500 });
  }
}
