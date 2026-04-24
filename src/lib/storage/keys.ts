import "server-only";

import { StorageError } from "./types";

const TENANT_PREFIX = "companies";
const DOCUMENT_PREFIX = "documents";
const FILENAME_MAX_LENGTH = 200;
// cuid2 is 24 chars; cuid is 25; accept 5–40 to stay flexible for tests
// and future id schemes, while rejecting obviously-invalid inputs like
// empty strings or values containing path separators.
const ID_PATTERN = /^[a-z0-9]{5,40}$/i;

/**
 * Build the canonical storage key for a document owned by a company.
 * Format: `companies/{companyId}/documents/{documentId}/{sanitizedFilename}`
 * Tenant isolation is enforced structurally — no document can leak across
 * tenants as long as all callers use this helper + `assertKeyBelongsToTenant`
 * on read/delete.
 */
export function buildStorageKey(
  companyId: string,
  documentId: string,
  filename: string,
): string {
  assertValidId(companyId, "companyId");
  assertValidId(documentId, "documentId");
  const sanitized = sanitizeFilename(filename);
  return `${TENANT_PREFIX}/${companyId}/${DOCUMENT_PREFIX}/${documentId}/${sanitized}`;
}

/**
 * Sanitise a user-provided filename so it's safe to write to disk and
 * identify in an object store.
 *
 * Rules:
 *  - Normalize to NFC (compose diacritics consistently).
 *  - Keep Unicode letters/digits (any script — covers Portuguese, Spanish,
 *    French, German, etc.), dot, hyphen, underscore. Replace any other
 *    char sequence with a single `_`.
 *  - Strip leading/trailing underscores and dots (blocks hidden files).
 *  - Cap length at 200 chars.
 *  - Reject null bytes, empty input, and results that are empty after cleaning.
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string" || filename.length === 0) {
    throw new StorageError("invalid_filename", "Filename is empty");
  }
  if (filename.includes("\0")) {
    throw new StorageError("invalid_filename", "Filename contains null byte");
  }
  const cleaned = filename
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}._\-]+/gu, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, FILENAME_MAX_LENGTH);
  if (cleaned.length === 0) {
    throw new StorageError(
      "invalid_filename",
      "Filename has no valid characters after sanitisation",
    );
  }
  return cleaned;
}

function assertValidId(id: unknown, label: string): asserts id is string {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new StorageError(
      "invalid_id",
      `Invalid ${label}: must match ${ID_PATTERN}`,
    );
  }
}

/**
 * Defence in depth: every read/delete verifies the storage key starts with
 * the caller's tenant prefix. Belt-and-braces against a bug that passes a
 * key from one company's DB row into another company's request context.
 */
export function assertKeyBelongsToTenant(
  storageKey: string,
  companyId: string,
): void {
  assertValidId(companyId, "companyId");
  const expected = `${TENANT_PREFIX}/${companyId}/`;
  if (!storageKey.startsWith(expected)) {
    throw new StorageError(
      "tenant_mismatch",
      "Storage key does not belong to the caller's tenant",
    );
  }
}
