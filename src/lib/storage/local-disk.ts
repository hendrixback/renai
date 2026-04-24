import "server-only";

import { constants, createReadStream } from "node:fs";
import { access, mkdir, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { assertKeyBelongsToTenant, buildStorageKey } from "./keys";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  StorageError,
  type StorageBackend,
  type UploadInput,
  type UploadResult,
} from "./types";

/**
 * Filesystem-backed storage implementation. Targets Railway persistent
 * Volumes in production (mounted at `/data/storage` per convention),
 * falls back to a local tmpdir path in dev/test via `STORAGE_ROOT`.
 *
 * Multi-tenancy is enforced by key prefix (ADR-006). The `resolveKey`
 * helper also guards against path-traversal payloads — a malicious
 * storage key containing `..` cannot escape `root`.
 */
export class LocalDiskStorage implements StorageBackend {
  readonly root: string;

  constructor(root: string) {
    if (!root) {
      throw new StorageError(
        "invalid_key",
        "STORAGE_ROOT is not set — pass a directory path to LocalDiskStorage",
      );
    }
    this.root = path.resolve(root);
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new StorageError(
        "unsupported_mime",
        `MIME type "${input.mimeType}" is not permitted`,
      );
    }
    if (input.data.length > MAX_FILE_SIZE_BYTES) {
      throw new StorageError(
        "file_too_large",
        `File is ${input.data.length} bytes (max ${MAX_FILE_SIZE_BYTES})`,
      );
    }

    const storageKey = buildStorageKey(
      input.companyId,
      input.documentId,
      input.filename,
    );
    const fullPath = this.resolveKey(storageKey);

    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.data);

    return {
      storageKey,
      size: input.data.length,
      mimeType: input.mimeType,
      sanitizedFilename: path.basename(storageKey),
    };
  }

  async read(
    companyId: string,
    storageKey: string,
  ): Promise<ReadableStream<Uint8Array>> {
    assertKeyBelongsToTenant(storageKey, companyId);
    const fullPath = this.resolveKey(storageKey);
    try {
      await access(fullPath, constants.R_OK);
    } catch {
      throw new StorageError(
        "not_found",
        "File does not exist or is unreadable",
      );
    }
    const nodeStream = createReadStream(fullPath);
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }

  async delete(companyId: string, storageKey: string): Promise<void> {
    assertKeyBelongsToTenant(storageKey, companyId);
    const fullPath = this.resolveKey(storageKey);

    try {
      await unlink(fullPath);
    } catch (err) {
      // Idempotent delete — "already gone" is success from the caller's POV.
      if (!isErrnoCode(err, "ENOENT")) throw err;
    }

    // Best-effort cleanup of the now-empty document directory. We do NOT
    // touch the parent tenant directory — it's cheaper to let it accumulate
    // than to race concurrent uploads into a disappeared directory.
    try {
      await rmdir(path.dirname(fullPath));
    } catch {
      // Directory not empty or already gone — not our concern.
    }
  }

  async exists(companyId: string, storageKey: string): Promise<boolean> {
    assertKeyBelongsToTenant(storageKey, companyId);
    try {
      const s = await stat(this.resolveKey(storageKey));
      return s.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Resolve a storage key to an absolute filesystem path, refusing any
   * path that escapes `root` (defence against `..` traversal in keys).
   */
  private resolveKey(storageKey: string): string {
    const resolved = path.resolve(this.root, storageKey);
    const expectedPrefix = this.root + path.sep;
    if (resolved !== this.root && !resolved.startsWith(expectedPrefix)) {
      throw new StorageError(
        "invalid_key",
        "Storage key resolves outside the storage root",
      );
    }
    return resolved;
  }
}

function isErrnoCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === code
  );
}
