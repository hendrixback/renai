import "server-only";

import { logger } from "@/lib/logger";

import { LocalDiskStorage } from "./local-disk";
import type { StorageBackend } from "./types";

const globalForStorage = globalThis as unknown as {
  renaiStorage: StorageBackend | undefined;
  renaiStorageWarned: boolean | undefined;
};

/**
 * Returns the process-wide storage backend.
 *
 * In production on Railway, set `STORAGE_ROOT=/data/storage` (or wherever
 * your persistent Volume is mounted). In dev, the default `/tmp/renai-storage`
 * is fine. In tests, pass an explicit tmpdir path via the constructor — do
 * not call `getStorage()` from tests.
 *
 * The backend is a singleton for the lifetime of the Node process; the
 * Volume handle is cheap so this is about consistency rather than cost.
 *
 * If `STORAGE_ROOT` is unset in a production-ish environment we log a LOUD
 * one-time warning rather than crashing. `/tmp` on Railway is ephemeral —
 * uploads will disappear on every redeploy — but a silent failure is worse
 * than a warned-about degraded state. Sentry will pick up the logger.error.
 */
export function getStorage(): StorageBackend {
  if (globalForStorage.renaiStorage) return globalForStorage.renaiStorage;

  const explicitRoot = process.env.STORAGE_ROOT;
  const root = explicitRoot ?? "/tmp/renai-storage";

  if (!explicitRoot && !globalForStorage.renaiStorageWarned) {
    globalForStorage.renaiStorageWarned = true;
    const isProdLike =
      process.env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;
    if (isProdLike) {
      logger.error(
        "STORAGE_ROOT is not set — file uploads will go to /tmp and be LOST on every redeploy. " +
          "Provision a Railway Volume and set STORAGE_ROOT to its mount path (e.g. /data/storage).",
        undefined,
        { event: "storage.config.missing_root" },
      );
    } else {
      logger.warn("STORAGE_ROOT unset; using dev default /tmp/renai-storage", {
        event: "storage.config.default_root",
      });
    }
  }

  globalForStorage.renaiStorage = new LocalDiskStorage(root);
  return globalForStorage.renaiStorage;
}

export { LocalDiskStorage } from "./local-disk";
export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  StorageError,
} from "./types";
export type {
  StorageBackend,
  StorageErrorCode,
  UploadInput,
  UploadResult,
} from "./types";
export {
  assertKeyBelongsToTenant,
  buildStorageKey,
  sanitizeFilename,
} from "./keys";
