import "server-only";

import PDFDocument from "pdfkit";

import type { ExportColumn, ExportDataset } from "./types";

const PAGE_MARGIN = 36;
const HEADER_FILL = "#f1f5f9";
const ROW_STRIPE = "#f9fafb";
const BORDER = "#e5e7eb";

function stringify<Row>(column: ExportColumn<Row>, row: Row): string {
  const raw = column.value(row);
  if (raw == null) return "—";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") {
    return column.type === "number" ? raw.toLocaleString("en-US") : String(raw);
  }
  return String(raw);
}

function columnWidths<Row>(columns: ExportColumn<Row>[], total: number): number[] {
  const weights = columns.map((c) => c.width ?? Math.max(c.header.length, 8));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.max(40, Math.floor((w / sum) * total)));
}

export function renderPdf<Row>(dataset: ExportDataset<Row>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE_MARGIN,
      info: {
        Title: dataset.title,
        Author: "RenAI",
        CreationDate: dataset.generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    const widths = columnWidths(dataset.columns, pageWidth);

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text(dataset.title);
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(`Company: ${dataset.companyName}`);
    doc.text(`Generated: ${dataset.generatedAt.toISOString().replace("T", " ").slice(0, 19)} UTC`);
    if (dataset.subtitle) doc.text(dataset.subtitle);
    doc.moveDown(0.8);

    const drawHeader = () => {
      const y = doc.y;
      const rowHeight = 18;
      doc.rect(PAGE_MARGIN, y, pageWidth, rowHeight).fill(HEADER_FILL);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9);
      let x = PAGE_MARGIN;
      dataset.columns.forEach((c, idx) => {
        doc.text(c.header, x + 4, y + 5, {
          width: widths[idx] - 8,
          align: c.align ?? "left",
          ellipsis: true,
          lineBreak: false,
        });
        x += widths[idx];
      });
      doc.y = y + rowHeight;
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + pageWidth, doc.y).strokeColor(BORDER).stroke();
    };

    drawHeader();

    doc.font("Helvetica").fontSize(9);
    dataset.rows.forEach((row, rowIdx) => {
      const values = dataset.columns.map((c) => stringify(c, row));
      const rowHeights = values.map((text, idx) =>
        doc.heightOfString(text, { width: widths[idx] - 8 }),
      );
      const rowHeight = Math.max(16, Math.ceil(Math.max(...rowHeights) + 8));

      if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      if (rowIdx % 2 === 1) {
        doc.rect(PAGE_MARGIN, y, pageWidth, rowHeight).fill(ROW_STRIPE);
      }
      doc.fillColor("#111827");
      let x = PAGE_MARGIN;
      values.forEach((text, idx) => {
        doc.text(text, x + 4, y + 4, {
          width: widths[idx] - 8,
          align: dataset.columns[idx].align ?? "left",
          ellipsis: true,
        });
        x += widths[idx];
      });
      doc.y = y + rowHeight;
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + pageWidth, doc.y).strokeColor(BORDER).stroke();
    });

    if (dataset.rows.length === 0) {
      doc.moveDown(1);
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6b7280").text("No records match the current filters.");
    }

    doc.end();
  });
}
