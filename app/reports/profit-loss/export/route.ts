import { buildProfitLoss, getAccountMovements, resolveLedgerScope } from "@/lib/ledger";
import {
  COMPANY_NAME,
  firstDayOfMonth,
  formatReportDate,
  isoDateOr,
  statementLabels,
  today,
} from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, writeHeader, writeStatement, writeTitle, xlsxResponse } from "@/lib/xlsx-report";
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

  const statement = buildProfitLoss(await getAccountMovements(scope, from, to), statementLabels(t), showZero);

  const { workbook, sheet } = newWorkbook(t("nav.profitLossReport"));
  sheet.columns = [{ width: 52 }, { width: 20 }];
  writeTitle(
    sheet,
    [
      `${t("reports.profitLossTitle")} ${COMPANY_NAME}`,
      scope.label,
      t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) }),
    ],
    2,
  );
  writeHeader(sheet, [t("reports.colDescription"), t("reports.colAmount")]);
  writeStatement(sheet, statement.rows);
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `laba-rugi-${outletCode}-${from}_to_${to}.xlsx`);
}
