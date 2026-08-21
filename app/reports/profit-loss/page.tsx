import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getProfitLossReport, type ReportGranularity } from "@/lib/reports";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ViewModeSelect } from "@/app/ui/reports/view-mode-select";
import { ExportControls } from "@/app/ui/reports/export-controls";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "ACCOUNTING"];

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPeriod(period: string, view: ReportGranularity, locale: string): string {
  if (view === "monthly") {
    const [year, month] = period.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      year: "numeric",
      month: "long",
    });
  }
  return new Date(`${period}T00:00:00`).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfitLossReportPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; view?: string }>;
}) {
  const session = await requireRole(ALLOWED_ROLES);
  const { t, locale } = await getT();
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const view: ReportGranularity = params.view === "monthly" ? "monthly" : "daily";
  const from = params.from ?? firstDayOfMonth();
  const to = params.to ?? today();

  const rows = await getProfitLossReport(selectedOutletId, from, to, view);

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      expenses: acc.expenses + r.expenses,
      netProfit: acc.netProfit + r.netProfit,
    }),
    { revenue: 0, expenses: 0, netProfit: 0 },
  );

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.profitLossReport")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
        <ViewModeSelect view={view} dailyLabel={t("reports.viewDaily")} monthlyLabel={t("reports.viewMonthly")} />
        <ExportControls
          exportPath="/reports/profit-loss/export"
          filenamePrefix="profit-loss-report"
          outletCode={selectedOutlet?.code ?? "outlet"}
          view={view}
          from={from}
          to={to}
          outletId={selectedOutletId}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("reports.viewModeHint")}</p>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900">{t("nav.profitLossReport")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">{t("reports.colPeriod")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colRevenue")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colExpenses")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colNetProfit")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("inventory.noDataInPeriod")}
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((row) => (
                      <tr key={row.period} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {formatPeriod(row.period, view, locale)}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{formatRp(row.revenue)}</td>
                        <td className="px-5 py-3 text-gray-700">{formatRp(row.expenses)}</td>
                        <td
                          className={`px-5 py-3 font-medium ${
                            row.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {formatRp(row.netProfit)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-gray-50/60">
                      <td className="px-5 py-3 font-semibold text-gray-900">{t("reports.totalRow")}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatRp(totals.revenue)}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatRp(totals.expenses)}</td>
                      <td
                        className={`px-5 py-3 font-semibold ${
                          totals.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatRp(totals.netProfit)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
