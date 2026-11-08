import { requireRole } from "@/lib/auth-guard";
import { buildProfitLoss, getAccountMovements, resolveLedgerScope } from "@/lib/ledger";
import {
  COMPANY_NAME,
  firstDayOfMonth,
  formatReportDate,
  isoDateOr,
  statementLabels,
  today,
} from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ReportDownload, ShowZeroToggle } from "@/app/ui/reports/report-filters";
import { StatementTable } from "@/app/ui/reports/statement-table";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

export default async function ProfitLossReportPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; zero?: string }>;
}) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());
  const showZero = params.zero === "1";

  const accounts = await getAccountMovements(scope, from, to);
  const statement = buildProfitLoss(accounts, statementLabels(t), showZero);

  const query = `outlet=${scope.selectedOutletId}&from=${from}&to=${to}${showZero ? "&zero=1" : ""}`;
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.profitLossReport")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <ShowZeroToggle checked={showZero} />
        <ReportDownload
          exportUrl={`/reports/profit-loss/export?${query}`}
          filename={`laba-rugi-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 text-center">
            <h2 className="text-base font-bold text-gray-900">
              {t("reports.profitLossTitle")} {COMPANY_NAME}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{scope.label}</p>
            <p className="text-xs text-gray-400">
              {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <StatementTable
            rows={statement.rows}
            descriptionHeader={t("reports.colDescription")}
            amountHeader={t("reports.colAmount")}
          />
        </div>
      </div>
    </>
  );
}
