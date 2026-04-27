import "server-only";

import ExcelJS from "exceljs";
import Papa from "papaparse";

import { MAX_IMPORT_ROWS, type ParsedFile } from "./types";

/**
 * Parsers for the two file formats Spec §20.4 lists for MVP:
 *  - CSV (UTF-8, RFC 4180-ish — papaparse handles quoted fields,
 *    embedded newlines, BOM).
 *  - XLSX (first sheet only; we surface a clear error if the file
 *    has multiple sheets so the user knows to pre-process).
 *
 * Both produce the same shape: an array of headers + an array of
 * objects keyed by the original header string. Header order is
 * preserved so the mapper UI can render columns left-to-right as the
 * user expects.
 *
 * The parsers are intentionally permissive: blank cells become "".
 * Per-row Zod validation downstream is the authority on what counts
 * as valid data — the parser's job is just to faithfully turn bytes
 * into row objects.
 */

const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/x-csv",
  "application/vnd.ms-excel",
  "text/plain", // some editors save CSV as text/plain
]);

const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
]);

export function detectFormat(
  filename: string,
  mimeType: string,
): "csv" | "xlsx" {
  if (XLSX_MIME_TYPES.has(mimeType) || /\.xlsx?$/i.test(filename)) return "xlsx";
  if (CSV_MIME_TYPES.has(mimeType) || /\.csv$/i.test(filename)) return "csv";
  // Default to csv — papaparse will fail loudly if it's actually binary.
  return "csv";
}

export class ImportParseError extends Error {
  readonly code = "IMPORT_PARSE_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

export async function parseFile(
  filename: string,
  mimeType: string,
  data: Buffer | Uint8Array,
): Promise<ParsedFile> {
  const format = detectFormat(filename, mimeType);
  return format === "xlsx" ? parseXlsx(data) : parseCsv(data);
}

function parseCsv(data: Buffer | Uint8Array): ParsedFile {
  const text = Buffer.isBuffer(data)
    ? data.toString("utf8")
    : Buffer.from(data).toString("utf8");

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (result.errors.length > 0) {
    // Papaparse reports per-row issues but they're rarely fatal —
    // surface only the first row-level fatal error.
    const fatal = result.errors.find((e) => e.type !== "Quotes");
    if (fatal) {
      throw new ImportParseError(
        `CSV parse failed at row ${fatal.row ?? "?"}: ${fatal.message}`,
      );
    }
  }

  const rows = result.data.slice(0, MAX_IMPORT_ROWS);
  const headers = (result.meta.fields ?? []).map((h) => h.trim());

  if (headers.length === 0) {
    throw new ImportParseError(
      "No header row detected. The first line of the CSV must contain column names.",
    );
  }

  return { headers, rows };
}

async function parseXlsx(data: Buffer | Uint8Array): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  try {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    // ExcelJS expects an ArrayBuffer-compatible Buffer.
    await workbook.xlsx.load(buf as unknown as ArrayBuffer);
  } catch (err) {
    throw new ImportParseError(
      `XLSX parse failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ImportParseError("The workbook has no sheets.");
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const value = cellToString(cell.value).trim();
    if (value.length > 0) headers.push(value);
  });
  if (headers.length === 0) {
    throw new ImportParseError(
      "No header row detected. The first row of the worksheet must contain column names.",
    );
  }

  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= sheet.rowCount && rows.length < MAX_IMPORT_ROWS; i++) {
    const row = sheet.getRow(i);
    const obj: Record<string, string> = {};
    let hasAny = false;
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      const value = cellToString(cell.value).trim();
      obj[h] = value;
      if (value.length > 0) hasAny = true;
    });
    if (hasAny) rows.push(obj);
  }

  return { headers, rows };
}

/**
 * ExcelJS surfaces cell values as a tagged union (formula, hyperlink,
 * date, number, etc.). Coerce everything to a stringy form the rest of
 * the pipeline can handle.
 */
function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) {
    // ISO date — downstream Zod can re-parse.
    return value.toISOString();
  }
  if (typeof value === "object") {
    // Hyperlink / formula / shared / rich text shapes.
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((rt) => rt.text).join("");
    }
    if ("hyperlink" in value && typeof (value as { hyperlink?: string }).hyperlink === "string") {
      return (value as { hyperlink: string }).hyperlink;
    }
  }
  return String(value);
}
