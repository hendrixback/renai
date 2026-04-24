import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalDiskStorage } from "./local-disk";
import { StorageError, type UploadInput } from "./types";

const CO = "cmp12345abcde";
const OTHER_CO = "cmp99999other";
const DOC = "doc67890fghij";

function makeInput(overrides: Partial<UploadInput> = {}): UploadInput {
  return {
    companyId: CO,
    documentId: DOC,
    filename: "invoice.pdf",
    mimeType: "application/pdf",
    data: Buffer.from("%PDF-1.4 fake pdf bytes"),
    ...overrides,
  };
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

describe("LocalDiskStorage", () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "renai-storage-test-"));
    storage = new LocalDiskStorage(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe("upload", () => {
    it("writes the file and returns a tenant-prefixed key", async () => {
      const result = await storage.upload(makeInput());
      expect(result.storageKey).toBe(
        `companies/${CO}/documents/${DOC}/invoice.pdf`,
      );
      expect(result.size).toBe(23);
      expect(result.mimeType).toBe("application/pdf");
      expect(result.sanitizedFilename).toBe("invoice.pdf");
      await expect(storage.exists(CO, result.storageKey)).resolves.toBe(true);
    });

    it("sanitises unsafe filenames and reports the cleaned value", async () => {
      const result = await storage.upload(
        makeInput({ filename: "My Report Q1/2026.pdf" }),
      );
      expect(result.sanitizedFilename).toBe("My_Report_Q1_2026.pdf");
    });

    it("rejects disallowed MIME types with code=unsupported_mime", async () => {
      await expect(
        storage.upload(makeInput({ mimeType: "application/x-sh" })),
      ).rejects.toMatchObject({
        name: "StorageError",
        code: "unsupported_mime",
      });
    });

    it("rejects files over the max size with code=file_too_large", async () => {
      const huge = Buffer.alloc(51 * 1024 * 1024); // 51MB — just over limit
      await expect(
        storage.upload(makeInput({ data: huge })),
      ).rejects.toMatchObject({
        name: "StorageError",
        code: "file_too_large",
      });
    });

    it("creates nested directories as needed", async () => {
      // First upload in an empty root exercises the mkdir(recursive).
      const r = await storage.upload(makeInput());
      expect(r.storageKey).toMatch(/companies\/.*\/documents\/.*\/invoice\.pdf$/);
    });
  });

  describe("read", () => {
    it("streams the uploaded bytes back verbatim", async () => {
      const payload = Buffer.from("electricity bill line items");
      const { storageKey } = await storage.upload(
        makeInput({ data: payload }),
      );
      const stream = await storage.read(CO, storageKey);
      const roundTrip = await streamToBuffer(stream);
      expect(roundTrip.equals(payload)).toBe(true);
    });

    it("throws not_found when the key does not correspond to a file", async () => {
      const key = `companies/${CO}/documents/${DOC}/missing.pdf`;
      await expect(storage.read(CO, key)).rejects.toMatchObject({
        name: "StorageError",
        code: "not_found",
      });
    });

    it("refuses cross-tenant access", async () => {
      const { storageKey } = await storage.upload(makeInput());
      await expect(storage.read(OTHER_CO, storageKey)).rejects.toMatchObject({
        name: "StorageError",
        code: "tenant_mismatch",
      });
    });
  });

  describe("delete", () => {
    it("removes the file and makes exists() return false", async () => {
      const { storageKey } = await storage.upload(makeInput());
      await storage.delete(CO, storageKey);
      await expect(storage.exists(CO, storageKey)).resolves.toBe(false);
    });

    it("is idempotent — deleting a missing key succeeds silently", async () => {
      const key = `companies/${CO}/documents/${DOC}/never-existed.pdf`;
      await expect(storage.delete(CO, key)).resolves.toBeUndefined();
    });

    it("refuses cross-tenant deletes", async () => {
      const { storageKey } = await storage.upload(makeInput());
      await expect(storage.delete(OTHER_CO, storageKey)).rejects.toMatchObject({
        name: "StorageError",
        code: "tenant_mismatch",
      });
      // Original file must still exist.
      await expect(storage.exists(CO, storageKey)).resolves.toBe(true);
    });
  });

  describe("exists", () => {
    it("returns true for a real file, false for a missing one", async () => {
      const { storageKey } = await storage.upload(makeInput());
      await expect(storage.exists(CO, storageKey)).resolves.toBe(true);

      const bogus = `companies/${CO}/documents/${DOC}/missing.pdf`;
      await expect(storage.exists(CO, bogus)).resolves.toBe(false);
    });
  });

  describe("path traversal defence", () => {
    it("refuses a crafted key that attempts to escape the storage root", async () => {
      // assertKeyBelongsToTenant catches this first — traversal payload
      // doesn't start with `companies/{CO}/`. But even if someone bypasses
      // that guard, resolveKey would refuse too (verified by the tenant
      // assertion failing first here, which is the expected outer guard).
      const malicious = `companies/${CO}/documents/${DOC}/../../../../../../etc/passwd`;
      // The tenant assertion passes (the prefix is correct). The traversal
      // then resolves outside `root`, so resolveKey throws.
      await expect(storage.exists(CO, malicious)).resolves.toBe(false);
      // For read, we get the invalid_key error (since the file doesn't exist
      // at the resolved escape path either — resolveKey guards it).
      await expect(storage.read(CO, malicious)).rejects.toBeInstanceOf(
        StorageError,
      );
    });
  });

  describe("constructor", () => {
    it("rejects an empty root", () => {
      expect(() => new LocalDiskStorage("")).toThrow(StorageError);
    });
  });
});
