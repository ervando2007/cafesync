import { hasOutletAccess } from "@/lib/auth-guard";
import { getJournalEntryById } from "@/lib/accounting";
import { formatReportDate } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, RP_FORMAT, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

/** One journal voucher in the "JURNAL UMUM" layout of RULES SISTEM CAFE.xlsx. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await authorizeExport(ACCOUNTING_REPORT_ROLES);
  if (session instanceof Response) return session;

  const entry = await getJournalEntryById(Number((await params).id));
  if (!entry) return new Response("Not found", { status: 404 });
  if (entry.outletId !== null && !(await hasOutletAccess(session, entry.outletId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const { t, locale } = await getT();
  const { workbook, sheet } = newWorkbook(t("accounting.generalJournal"));
  sheet.columns = [{ width: 6 }, { width: 34 }, { width: 14 }, { width: 38 }, { width: 18 }, { width: 18 }];
  const thin = { style: "thin" as const };
  const box = { top: thin, bottom: thin, left: thin, right: thin };

  const title = sheet.addRow([t("accounting.generalJournal").toUpperCase()]);
  sheet.mergeCells(title.number, 1, title.number, 6);
  title.getCell(1).font = { bold: true, size: 14 };
  title.getCell(1).alignment = { horizontal: "center" };
  sheet.addRow([]);
  sheet.addRow([t("accounting.colDate").toUpperCase(), formatReportDate(entry.entryDate, locale), "", t("accounting.voucherNo").toUpperCase(), entry.voucherNo ?? "-"]);
  sheet.addRow([t("accounting.pic").toUpperCase(), entry.pic ?? "-", "", t("accounting.colJournalNo").toUpperCase(), entry.journalNo]);
  sheet.addRow([t("nav.outlets").toUpperCase(), entry.outletName ?? "-", "", t("accounting.memo").toUpperCase(), entry.memo ?? ""]);
  sheet.addRow([]);

  const header = sheet.addRow([
    t("accounting.colNo").toUpperCase(),
    t("accounting.colAccount").toUpperCase(),
    t("accounting.colQty").toUpperCase(),
    t("accounting.colDescription").toUpperCase(),
    t("accounting.colDebit").toUpperCase(),
    t("accounting.colCredit").toUpperCase(),
  ]);
  header.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = box;
    cell.alignment = { horizontal: "center" };
    // Yellow columns as in the template (all but KETERANGAN).
    if (col !== 4) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF99" } };
  });

  entry.lines.forEach((line, i) => {
    const row = sheet.addRow([
      i + 1,
      `${line.accountCode} — ${line.accountName}`,
      line.qty != null ? `${line.qty} ${line.unitName ?? ""}`.trim() : "",
      [line.stockItemName, line.memo].filter(Boolean).join(" — "),
      line.debit || null,
      line.credit || null,
    ]);
    row.eachCell({ includeEmpty: true }, (cell) => (cell.border = box));
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(5).numFmt = RP_FORMAT;
    row.getCell(6).numFmt = RP_FORMAT;
  });
  const total = sheet.addRow([
    "",
    "",
    "",
    t("reports.totalRow").toUpperCase(),
    entry.lines.reduce((s, l) => s + l.debit, 0),
    entry.lines.reduce((s, l) => s + l.credit, 0),
  ]);
  total.font = { bold: true };
  total.getCell(5).numFmt = RP_FORMAT;
  total.getCell(6).numFmt = RP_FORMAT;
  total.getCell(5).border = total.getCell(6).border = box;

  sheet.addRow([]);
  sheet.addRow([]);
  const signHeader = sheet.addRow([
    t("accounting.madeBy").toUpperCase(),
    "",
    "",
    t("accounting.approvedBy").toUpperCase(),
    t("accounting.acknowledgedBy").toUpperCase(),
  ]);
  sheet.mergeCells(signHeader.number, 1, signHeader.number, 2);
  sheet.mergeCells(signHeader.number, 5, signHeader.number, 6);
  signHeader.font = { bold: true };
  for (let i = 0; i < 3; i++) sheet.addRow([]);
  const names = sheet.addRow([entry.createdByName ?? "", "", "", entry.approvedBy ?? "", entry.acknowledgedBy ?? ""]);
  sheet.mergeCells(names.number, 1, names.number, 2);
  sheet.mergeCells(names.number, 5, names.number, 6);
  [1, 4, 5].forEach((c) => (names.getCell(c).border = { top: thin }));
  applyBaseFont(sheet);

  return xlsxResponse(workbook, `jurnal-umum-${entry.voucherNo ?? entry.journalNo}.xlsx`);
}
