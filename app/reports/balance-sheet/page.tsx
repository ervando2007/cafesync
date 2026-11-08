import { requireRole } from "@/lib/auth-guard";
import { getBalanceSheet, resolveLedgerScope } from "@/lib/ledger";
import { COMPANY_NAME, formatReportDate, isoDateOr, statementLabels, today } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { AsOfDateSelect, ReportDownload, ShowZeroToggle } from "@/app/ui/reports/report-filters";
import { StatementTable } from "@/app/ui/reports/statement-table";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export default async function BalanceSheetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; to?: string; zero?: string }>;
}) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const asOf = isoDateOr(params.to, today());
  const showZero = params.zero === "1";

  const statement = await getBalanceSheet(scope, asOf, statementLabels(t), showZero);
  const gap = statement.totalAssets - statement.totalLiabilitiesEquity;

  const query = `outlet=${scope.selectedOutletId}&to=${asOf}${showZero ? "&zero=1" : ""}`;
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.balanceSheetReport")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <AsOfDateSelect value={asOf} />
        <ShowZeroToggle checked={showZero} />
        <ReportDownload exportUrl={`/reports/balance-sheet/export?${query}`} filename={`neraca-${outletCode}-${asOf}.xlsx`} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {Math.abs(gap) >= 1 && (
          <div className="mx-auto mb-4 max-w-3xl rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {t("reports.balanceMismatch", { amount: formatRp(gap) })}
          </div>
        )}
        <p className="mx-auto mb-3 max-w-3xl text-xs text-gray-400">{t("reports.openingBalanceScopeHint")}</p>
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 text-center">
            <h2 className="text-base font-bold text-gray-900">
              {t("reports.balanceSheetTitle")} {COMPANY_NAME}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{scope.label}</p>
            <p className="text-xs text-gray-400">{t("reports.asOfLabel", { date: formatReportDate(asOf, locale) })}</p>
          </div>
          <StatementTable
            rows={statement.rows}
            descriptionHeader={t("reports.colAccountName")}
            amountHeader={t("reports.colYearToDate")}
          />
        </div>
      </div>
    </>
  );
}
