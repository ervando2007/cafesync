import { getAccounts } from "@/lib/accounting";
import { getLedgerHistory, resolveLedgerScope } from "@/lib/ledger";
import {
  COMPANY_NAME,
  firstDayOfMonth,
  formatReportDate,
  isoDateOr,
  sourceTypeLabel,
  today,
} from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, RP2_FORMAT, writeHeader, writeTitle, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const session = await authorizeExport(ACCOUNTING_REPORT_ROLES);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t, locale } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const accounts = await getAccounts();
  const requested = Number(url.searchParams.get("account"));
  const accountId = accounts.some((a) => a.id === requested) ? requested : null;

  const rows = await getLedgerHistory(scope, from, to, accountId);

  const { workbook, sheet } = newWorkbook(t("nav.generalLedger"));
  sheet.columns = [
    { width: 14 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 30 }, { width: 40 }, { width: 18 }, { width: 18 },
  ];
  writeTitle(
    sheet,
    [
      COMPANY_NAME,
      t("reports.generalLedgerTitle"),
      `${scope.label} · ${t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}`,
    ],
    8,
  );
  writeHeader(sheet, [
    t("reports.colDate"),
    t("reports.colSourceType"),
    t("reports.colSourceNo"),
    t("reports.colAccountNo"),
    t("reports.colAccountName"),
    t("reports.colDescription"),
    t("reports.colDebitAmount"),
    t("reports.colCreditAmount"),
  ]);
  const firstDataRow = sheet.rowCount + 1;
  for (const r of rows) {
    const row = sheet.addRow([
      formatReportDate(r.date, locale),
      sourceTypeLabel(t, r.sourceType),
      r.sourceNo,
      r.accountCode,
      r.accountName,
      r.description,
      r.debit,
      r.credit,
    ]);
    row.getCell(7).numFmt = RP2_FORMAT;
    row.getCell(8).numFmt = RP2_FORMAT;
  }
  const lastDataRow = sheet.rowCount;
  const total = sheet.addRow([t("reports.totalRow"), "", "", "", "", ""]);
  // Live SUM formulas with the computed totals as cached results.
  total.getCell(7).value = {
    formula: rows.length ? `SUM(G${firstDataRow}:G${lastDataRow})` : "0",
    result: rows.reduce((s, r) => s + r.debit, 0),
  };
  total.getCell(8).value = {
    formula: rows.length ? `SUM(H${firstDataRow}:H${lastDataRow})` : "0",
    result: rows.reduce((s, r) => s + r.credit, 0),
  };
  total.font = { bold: true };
  total.getCell(7).numFmt = RP2_FORMAT;
  total.getCell(8).numFmt = RP2_FORMAT;
  total.getCell(7).border = total.getCell(8).border = { top: { style: "thin" }, bottom: { style: "double" } };
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `buku-besar-${outletCode}-${from}_to_${to}.xlsx`);
}
