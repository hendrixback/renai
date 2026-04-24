import { describe, expect, it } from "vitest";

import { renderCsv } from "./csv";
import { renderPdf } from "./pdf";
import { renderXlsx } from "./xlsx";
import type { ExportDataset } from "./types";

type Row = {
  name: string;
  category: string | null;
  quantity: number | null;
  isHazardous: boolean;
  createdAt: Date;
};

const dataset: ExportDataset<Row> = {
  title: "Waste Flows",
  subtitle: "Filters — Category: Plastic",
  generatedAt: new Date("2026-04-24T12:00:00Z"),
  companyName: "Test Co.",
  rows: [
    { name: "PET, bottles", category: "Plastic", quantity: 1234.5, isHazardous: false, createdAt: new Date("2026-01-15") },
    { name: 'With "quotes"', category: null, quantity: null, isHazardous: true, createdAt: new Date("2026-02-02") },
  ],
  columns: [
    { key: "name", header: "Name", value: (r) => r.name },
    { key: "category", header: "Category", value: (r) => r.category },
    { key: "quantity", header: "Quantity", type: "number", value: (r) => r.quantity },
    { key: "hazardous", header: "Hazardous", type: "boolean", value: (r) => r.isHazardous },
    { key: "createdAt", header: "Created", type: "date", value: (r) => r.createdAt },
  ],
};

describe("renderCsv", () => {
  const csv = renderCsv(dataset).toString("utf8");

  it("starts with UTF-8 BOM so Excel opens it correctly on Windows", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("emits a header row", () => {
    expect(csv).toContain("Name,Category,Quantity,Hazardous,Created");
  });

  it("escapes values containing commas or quotes", () => {
    // Name "PET, bottles" must be wrapped in quotes; 'With "quotes"' must have "" doubled.
    expect(csv).toContain('"PET, bottles"');
    expect(csv).toContain('"With ""quotes"""');
  });

  it("renders booleans as Yes/No and blanks nulls", () => {
    expect(csv).toContain("No");
    expect(csv).toContain("Yes");
    // Null quantity on the second data row -> empty field between commas.
    const lines = csv.split("\r\n");
    expect(lines[2]).toContain(",,"); // null category followed by null quantity
  });

  it("renders dates as ISO timestamps", () => {
    expect(csv).toContain("2026-01-15T00:00:00.000Z");
  });
});

describe("renderXlsx", () => {
  it("produces a zipfile (XLSX is a ZIP container)", async () => {
    const buf = await renderXlsx(dataset);
    // PK\x03\x04 is the zip local file header magic.
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
    expect(buf.byteLength).toBeGreaterThan(2000);
  });
});

describe("renderPdf", () => {
  it("produces a PDF with the correct magic header", async () => {
    const buf = await renderPdf(dataset);
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it("handles empty datasets without throwing", async () => {
    const empty: ExportDataset<Row> = { ...dataset, rows: [] };
    const buf = await renderPdf(empty);
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
