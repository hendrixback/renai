import "server-only";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export const EXPORT_FORMATS: readonly ExportFormat[] = ["csv", "xlsx", "pdf"];

export type ExportColumnType = "text" | "number" | "date" | "boolean";

/**
 * Declarative description of one column to export.
 *
 * `value(row)` returns the raw value used by every format. Keep it
 * JSON-ish — strings, numbers, Date, boolean, null — the renderers
 * coerce from there.
 */
export type ExportColumn<Row> = {
  key: string;
  header: string;
  type?: ExportColumnType;
  /** Width hint: XLSX character width; PDF proportional weight. */
  width?: number;
  align?: "left" | "right" | "center";
  value: (row: Row) => string | number | Date | boolean | null | undefined;
};

export type ExportDataset<Row> = {
  /** Human title, used as PDF heading / XLSX sheet name / CSV & PDF filename prefix. */
  title: string;
  /** Optional one-line context, typically a summary of applied filters. */
  subtitle?: string;
  generatedAt: Date;
  companyName: string;
  rows: Row[];
  columns: ExportColumn<Row>[];
};

/** Parse a format query param, defaulting to CSV when missing/invalid. */
export function parseExportFormat(raw: string | null | undefined): ExportFormat {
  if (raw && (EXPORT_FORMATS as readonly string[]).includes(raw)) {
    return raw as ExportFormat;
  }
  return "csv";
}
