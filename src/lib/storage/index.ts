import "server-only";

import { LocalDiskStorage } from "./local-disk";
import type { StorageBackend } from "./types";

const globalForStorage = globalThis as unknown as {
  renaiStorage: StorageBackend | undefined;
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
 */
export function getStorage(): StorageBackend {
  if (globalForStorage.renaiStorage) return globalForStorage.renaiStorage;
  const root = process.env.STORAGE_ROOT ?? "/tmp/renai-storage";
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
