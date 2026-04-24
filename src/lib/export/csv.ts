import "server-only";

import type { ExportColumn, ExportDataset } from "./types";

const UTF8_BOM = "﻿";

function coerce<Row>(column: ExportColumn<Row>, row: Row): string {
  const raw = column.value(row);
  if (raw == null) return "";
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  return String(raw);
}

function escape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function renderCsv<Row>(dataset: ExportDataset<Row>): Buffer {
  const lines: string[] = [];
  lines.push(dataset.columns.map((c) => escape(c.header)).join(","));
  for (const row of dataset.rows) {
    lines.push(dataset.columns.map((c) => escape(coerce(c, row))).join(","));
  }
  // BOM so Excel opens UTF-8 correctly on Windows.
  return Buffer.from(UTF8_BOM + lines.join("\r\n") + "\r\n", "utf8");
}
