import { describe, expect, it } from "vitest";

import {
  assertKeyBelongsToTenant,
  buildStorageKey,
  sanitizeFilename,
} from "./keys";
import { StorageError } from "./types";

const CO = "cmp12345abcde";
const DOC = "doc67890fghij";

describe("buildStorageKey", () => {
  it("builds the canonical tenant-prefixed path", () => {
    const key = buildStorageKey(CO, DOC, "invoice.pdf");
    expect(key).toBe(`companies/${CO}/documents/${DOC}/invoice.pdf`);
  });

  it("sanitises the filename inside the key", () => {
    const key = buildStorageKey(CO, DOC, "Invoice Q1/2026.pdf");
    expect(key).toBe(`companies/${CO}/documents/${DOC}/Invoice_Q1_2026.pdf`);
  });

  it.each([
    ["empty companyId", "", DOC, "f.pdf"],
    ["empty documentId", CO, "", "f.pdf"],
    ["companyId with path separator", "co/../foo", DOC, "f.pdf"],
    ["documentId with whitespace", CO, "doc 123", "f.pdf"],
    ["too-short companyId", "abc", DOC, "f.pdf"],
  ])("rejects %s", (_name, company, document, filename) => {
    expect(() => buildStorageKey(company, document, filename)).toThrow(
      StorageError,
    );
  });
});

describe("sanitizeFilename", () => {
  it("keeps safe filenames unchanged", () => {
    expect(sanitizeFilename("invoice.pdf")).toBe("invoice.pdf");
    expect(sanitizeFilename("report-2026_Q1.xlsx")).toBe("report-2026_Q1.xlsx");
  });

  it("replaces spaces and path separators with underscores", () => {
    expect(sanitizeFilename("my report.pdf")).toBe("my_report.pdf");
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc_passwd");
  });

  it("strips leading dots to prevent hidden files", () => {
    expect(sanitizeFilename(".env")).toBe("env");
    expect(sanitizeFilename("..hidden")).toBe("hidden");
  });

  it("caps length at 200 characters", () => {
    const long = "a".repeat(400) + ".pdf";
    expect(sanitizeFilename(long).length).toBe(200);
  });

  it("normalises unicode (combining marks merged into base char class)", () => {
    // "é" written as e + U+0301 (combining acute) → "e_" after cleanup
    // becomes a single NFC codepoint first, then treated as a regular
    // word character.
    const composed = "éclair.pdf"; // é + clair
    expect(sanitizeFilename(composed)).toBe("éclair.pdf");
  });

  it.each([
    ["empty string", ""],
    ["null byte", "file\0name.pdf"],
    ["only separators", "///"],
    ["only dots", "....."],
  ])("rejects %s", (_name, input) => {
    expect(() => sanitizeFilename(input)).toThrow(StorageError);
  });

  it("wraps failures in StorageError with invalid_filename code", () => {
    try {
      sanitizeFilename("");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(StorageError);
      if (err instanceof StorageError) {
        expect(err.code).toBe("invalid_filename");
      }
    }
  });
});

describe("assertKeyBelongsToTenant", () => {
  it("passes when the key matches the tenant prefix", () => {
    const key = `companies/${CO}/documents/${DOC}/file.pdf`;
    expect(() => assertKeyBelongsToTenant(key, CO)).not.toThrow();
  });

  it("throws tenant_mismatch when the key belongs to a different company", () => {
    const key = `companies/other999abcde/documents/${DOC}/file.pdf`;
    try {
      assertKeyBelongsToTenant(key, CO);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(StorageError);
      if (err instanceof StorageError) {
        expect(err.code).toBe("tenant_mismatch");
      }
    }
  });

  it("throws tenant_mismatch on a malformed key", () => {
    expect(() => assertKeyBelongsToTenant("random/garbage", CO)).toThrow(
      StorageError,
    );
  });

  it("rejects a key that matches the companyId as a substring but not prefix", () => {
    // Would be a bug if we used includes() instead of startsWith().
    const key = `noncompanies/${CO}/documents/doc/f.pdf`;
    expect(() => assertKeyBelongsToTenant(key, CO)).toThrow(StorageError);
  });

  it("validates the companyId format too (defence in depth)", () => {
    // If a caller somehow passes an invalid companyId, we refuse —
    // we'd rather fail loud than accept matches against a degenerate value.
    expect(() => assertKeyBelongsToTenant("companies//x", "")).toThrow(
      StorageError,
    );
  });
});
