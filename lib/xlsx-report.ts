import "server-only";
import ExcelJS from "exceljs";
import type { StatementRow } from "@/lib/ledger";

/** Shared Excel layout for the RULES SISTEM CAFE report formats. */

export const RP_FORMAT = '#,##0;(#,##0);"-"';
export const RP2_FORMAT = '#,##0.00;(#,##0.00);"-"';
/** Accurate-style signed balance: "(Dr) 1.234,00" / "(Cr) -1.234,00". */
export const DRCR_FORMAT = '"(Dr) "#,##0.00;"(Cr) "-#,##0.00;"(Dr) "0.00';

const BASE_FONT: Partial<ExcelJS.Font> = { name: "Arial", size: 10 };

export function newWorkbook(sheetName: string): { workbook: ExcelJS.Workbook; sheet: ExcelJS.Worksheet } {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CafeSync";
  // Excel sheet names: max 31 chars, no []:*?/\
  const sheet = workbook.addWorksheet(sheetName.replace(/[[\]:*?/\\]/g, " ").slice(0, 31));
  return { workbook, sheet };
}

/** Title block: each line on its own row, merged across `width` columns. */
export function writeTitle(sheet: ExcelJS.Worksheet, lines: string[], width: number): void {
  lines.forEach((text, i) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, width);
    row.getCell(1).font = { ...BASE_FONT, bold: true, size: i === 0 ? 13 : 10 };
    row.getCell(1).alignment = { horizontal: "center" };
  });
  sheet.addRow([]);
}

export function writeHeader(sheet: ExcelJS.Worksheet, headers: string[]): ExcelJS.Row {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { ...BASE_FONT, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8D8" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  return row;
}

export function applyBaseFont(sheet: ExcelJS.Worksheet): void {
  sheet.eachRow((row) =>
    row.eachCell((cell) => {
      cell.font = { ...BASE_FONT, ...(cell.font ?? {}) };
    }),
  );
}

/** Two-column statement (KETERANGAN | JUMLAH) used by Laba Rugi and Neraca. */
export function writeStatement(sheet: ExcelJS.Worksheet, rows: StatementRow[]): void {
  for (const r of rows) {
    if (r.kind === "section") {
      sheet.addRow([]);
      const row = sheet.addRow([r.label]);
      row.getCell(1).font = { ...BASE_FONT, bold: true };
    } else if (r.kind === "group") {
      const row = sheet.addRow([r.label]);
      row.getCell(1).font = { ...BASE_FONT, bold: true, italic: true };
    } else if (r.kind === "line") {
      const row = sheet.addRow([`${r.code ? `${r.code}  ` : ""}${r.label}`, r.amount]);
      row.getCell(1).alignment = { indent: 1 };
      row.getCell(2).numFmt = RP_FORMAT;
    } else {
      const row = sheet.addRow([r.label, r.amount]);
      row.getCell(1).font = { ...BASE_FONT, bold: true };
      row.getCell(2).font = { ...BASE_FONT, bold: true };
      row.getCell(2).numFmt = RP_FORMAT;
      row.getCell(2).border = r.kind === "total" ? { top: { style: "thin" }, bottom: { style: "double" } } : { top: { style: "thin" } };
    }
  }
}

export async function xlsxResponse(workbook: ExcelJS.Workbook, filename: string): Promise<Response> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\-]+/g, "_")}"`,
    },
  });
}
