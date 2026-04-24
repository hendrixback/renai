import Link from "next/link";
import { DownloadIcon, FileIcon, PaperclipIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import {
  type DocumentModule,
  documentModuleSchema,
} from "@/lib/schemas/document.schema";
import { DocumentService } from "@/lib/services/documents";
import { formatBytes } from "@/lib/format/bytes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Server component. Lists all documents attached to a given record and
 * surfaces an "Attach document" button that hops through /documentation/new
 * with the right link + redirectTo params so the user lands back on the
 * originating record page after upload.
 *
 * Embed on any detail page:
 *   <DocumentAttachments module="waste-flows" recordId={flow.id} />
 */
export async function DocumentAttachments({
  module,
  recordId,
  redirectTo,
}: {
  /** One of the DocumentModule values — keep in sync with the schema enum. */
  module: DocumentModule;
  recordId: string;
  /** Where the user should return to after upload. Defaults to the current page. */
  redirectTo?: string;
}) {
  // Light runtime check so bad call sites fail loudly — the Zod parse
  // throws if `module` is somehow not a valid value.
  documentModuleSchema.parse(module);

  const ctx = await getCurrentContext();
  if (!ctx) return null;

  const documents = await DocumentService.listForRecord(ctx, module, recordId);

  const uploadHref = buildUploadHref(module, recordId, redirectTo);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PaperclipIcon className="size-4" />
          Documents
          <span className="text-muted-foreground text-sm font-normal">
            ({documents.length})
          </span>
        </CardTitle>
        <Button size="sm" variant="outline" render={<Link href={uploadHref} />}>
          Attach document
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileIcon className="text-muted-foreground/60 size-8" />
            <p className="text-muted-foreground text-sm">
              No documents attached yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileIcon className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {doc.title ?? doc.originalFilename}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(doc.size)} ·{" "}
                      {doc.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Download ${doc.originalFilename}`}
                  render={<Link href={`/documentation/${doc.id}/download`} />}
                >
                  <DownloadIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function buildUploadHref(
  module: DocumentModule,
  recordId: string,
  redirectTo?: string,
): string {
  const params = new URLSearchParams({
    linkModule: module,
    linkRecordId: recordId,
  });
  if (redirectTo) params.set("redirectTo", redirectTo);
  return `/documentation/new?${params.toString()}`;
}
