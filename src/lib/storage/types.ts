import "server-only";

/**
 * Input to a file upload. Caller is responsible for generating `documentId`
 * (typically the id of the Document DB row) before calling upload so the
 * row and the file share a stable key.
 */
export type UploadInput = {
  companyId: string;
  documentId: string;
  filename: string;
  mimeType: string;
  data: Buffer | Uint8Array;
};

/**
 * Result of a successful upload. `storageKey` is the opaque identifier the
 * caller persists on the Document row; it's the only input needed for later
 * reads/deletes (paired with companyId for tenant defence-in-depth).
 */
export type UploadResult = {
  storageKey: string;
  size: number;
  mimeType: string;
  sanitizedFilename: string;
};

/**
 * Storage backend contract. All implementations must:
 *  - prefix keys with `companies/{companyId}/...`
 *  - reject reads/deletes whose key doesn't match the caller's companyId
 *  - enforce the MIME whitelist and max-size cap on upload
 *
 * Current implementations:
 *  - LocalDiskStorage (Railway Volumes / local filesystem) — in use.
 *  - Future R2Storage (Cloudflare R2) — interface-ready per ADR-001.
 */
export interface StorageBackend {
  upload(input: UploadInput): Promise<UploadResult>;
  read(
    companyId: string,
    storageKey: string,
  ): Promise<ReadableStream<Uint8Array>>;
  delete(companyId: string, storageKey: string): Promise<void>;
  exists(companyId: string, storageKey: string): Promise<boolean>;
}

export type StorageErrorCode =
  | "unsupported_mime"
  | "file_too_large"
  | "invalid_filename"
  | "invalid_id"
  | "invalid_key"
  | "tenant_mismatch"
  | "not_found"
  | "io_error";

/**
 * Typed error thrown by storage operations. Server actions catch this and
 * surface a safe message to the client; the `code` field enables per-case
 * handling (e.g. "file_too_large" → field error, everything else → generic).
 */
export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

/**
 * File types permitted by the Documentation module (Spec §15.4).
 *
 * Adding a new MIME type requires:
 *  - Ensuring the preview UI supports it (or falls back to download-only)
 *  - Confirming no active exploit path (e.g. SVG — excluded pending sanitisation)
 */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls (legacy)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc (legacy)
  "text/csv",
  "text/plain",
]);

/** Max per-file size enforced at upload (Spec Amendment B4). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
