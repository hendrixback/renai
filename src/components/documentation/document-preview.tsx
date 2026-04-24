import { FileIcon, FileTextIcon } from "lucide-react";

const IMAGE_MIME_PREFIX = "image/";
const PDF_MIME = "application/pdf";

/**
 * Inline preview for a Document.
 *
 * PDF → `<iframe>` pointed at the download route in inline mode.
 * Image → `<img>` with the same inline URL.
 * Anything else → a friendly "download to view" fallback.
 *
 * The URL is same-origin + authenticated by the download route's tenant
 * check. We don't embed signed URLs here — same-origin is sufficient
 * since cookies carry the session.
 */
export function DocumentPreview({
  documentId,
  filename,
  mimeType,
}: {
  documentId: string;
  filename: string;
  mimeType: string;
}) {
  const inlineUrl = `/documentation/${documentId}/download?inline=1`;

  if (mimeType === PDF_MIME) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <iframe
          src={inlineUrl}
          title={`Preview of ${filename}`}
          className="h-[70vh] w-full"
        />
      </div>
    );
  }

  if (mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-4">
        {/*
          next/image isn't appropriate here: the source is an auth-gated,
          one-off, variable-dimension stream from our own server. The
          optimizer would add a network hop and cache tenant data it
          shouldn't. Native <img> with same-origin credentials is correct.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inlineUrl}
          alt={filename}
          className="max-h-[70vh] max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-12 text-center">
      <FileTextIcon className="text-muted-foreground/60 size-12" />
      <div>
        <p className="font-medium">Preview not available for this file type</p>
        <p className="text-muted-foreground text-sm">
          Use the Download button above to open the file locally.
        </p>
      </div>
      <FileIcon className="sr-only" />
    </div>
  );
}
