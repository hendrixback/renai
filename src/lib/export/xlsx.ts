import "server-only";

import ExcelJS from "exceljs";

import type { ExportColumn, ExportDataset } from "./types";

function valueFor<Row>(column: ExportColumn<Row>, row: Row): ExcelJS.CellValue {
  const raw = column.value(row);
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") return raw;
  if (column.type === "number") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : String(raw);
  }
  return String(raw);
}

export async function renderXlsx<Row>(dataset: ExportDataset<Row>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RenAI";
  workbook.created = dataset.generatedAt;

  // Sheet name: ExcelJS rejects > 31 chars and `/\?*[]:`.
  const rawName = dataset.title.slice(0, 31).replace(/[\\/?*[\]:]/g, "-");
  const sheet = workbook.addWorksheet(rawName || "Sheet1");

  // Metadata rows before the table so the audit context travels with the file.
  sheet.addRow([dataset.title]).font = { bold: true, size: 14 };
  sheet.addRow([`Company: ${dataset.companyName}`]);
  sheet.addRow([`Generated: ${dataset.generatedAt.toISOString()}`]);
  if (dataset.subtitle) sheet.addRow([dataset.subtitle]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(dataset.columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    cell.border = { bottom: { style: "thin" } };
  });

  for (const row of dataset.rows) {
    sheet.addRow(dataset.columns.map((c) => valueFor(c, row)));
  }

  dataset.columns.forEach((c, idx) => {
    const col = sheet.getColumn(idx + 1);
    col.width = c.width ?? Math.max(c.header.length + 2, 14);
    if (c.type === "date") {
      col.numFmt = "yyyy-mm-dd";
    } else if (c.type === "number") {
      col.numFmt = "#,##0.###";
    }
    if (c.align) col.alignment = { horizontal: c.align };
  });

  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}
