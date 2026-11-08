import { buildLedgerSummary, getAccountMovements, resolveLedgerScope } from "@/lib/ledger";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import {
  applyBaseFont,
  DRCR_FORMAT,
  newWorkbook,
  RP2_FORMAT,
  writeHeader,
  writeTitle,
  xlsxResponse,
} from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const session = await authorizeExport(ACCOUNTING_REPORT_ROLES);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t, locale } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const showZero = url.searchParams.get("zero") === "1";

  const rows = buildLedgerSummary(await getAccountMovements(scope, from, to), showZero);

  const { workbook, sheet } = newWorkbook(t("nav.ledgerSummary"));
  sheet.columns = [{ width: 12 }, { width: 12 }, { width: 34 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 22 }];
  writeTitle(
    sheet,
    [
      COMPANY_NAME,
      t("reports.ledgerSummaryTitle"),
      `${scope.label} · ${t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}`,
    ],
    8,
  );
  // Parent account numbers sit in column A and children in column B, as in the template.
  const header = writeHeader(sheet, [
    t("reports.colAccountNo"),
    "",
    t("reports.colAccountName"),
    t("reports.colBeginningBalance"),
    t("reports.colChangeDebit"),
    t("reports.colChangeCredit"),
    t("reports.colNetChange"),
    t("reports.colEndingBalance"),
  ]);
  sheet.mergeCells(header.number, 1, header.number, 2);

  for (const r of rows) {
    const parent = r.level === 0;
    const row = sheet.addRow([
      parent ? r.code : "",
      parent ? "" : r.code,
      r.name,
      r.beginning,
      r.debit,
      r.credit,
      r.netChange,
      r.ending,
    ]);
    row.getCell(4).numFmt = DRCR_FORMAT;
    row.getCell(5).numFmt = RP2_FORMAT;
    row.getCell(6).numFmt = RP2_FORMAT;
    row.getCell(7).numFmt = DRCR_FORMAT;
    row.getCell(8).numFmt = DRCR_FORMAT;
    if (parent) row.font = { bold: true };
  }
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `ringkasan-buku-besar-${outletCode}-${from}_to_${to}.xlsx`);
}
