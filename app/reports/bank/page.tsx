import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getCashAccountReport, type ReportGranularity } from "@/lib/reports";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ViewModeSelect } from "@/app/ui/reports/view-mode-select";
import { ExportControls } from "@/app/ui/reports/export-controls";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "ACCOUNTING"];
const BANK_ACCOUNT_CODE = "1110";

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

export default async function BankReportPage({
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

  const rows = await getCashAccountReport(selectedOutletId, from, to, view, BANK_ACCOUNT_CODE);
  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);
  const closingBalance = rows.length > 0 ? rows[rows.length - 1].closingBalance : 0;

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.bankReport")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
        <ViewModeSelect view={view} dailyLabel={t("reports.viewDaily")} monthlyLabel={t("reports.viewMonthly")} />
        <ExportControls
          exportPath="/reports/bank/export"
          filenamePrefix="bank-report"
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
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900">{t("nav.bankReport")}</h2>
            <div className="text-right">
              <p className="text-xs text-gray-400">{t("reports.colClosingBalance")}</p>
              <p className="text-base font-bold text-amber-700">{formatRp(closingBalance)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">{t("reports.colPeriod")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colCashIn")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colCashOut")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colNetChange")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.colClosingBalance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("inventory.noDataInPeriod")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.period} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {formatPeriod(row.period, view, locale)}
                      </td>
                      <td className="px-5 py-3 text-emerald-600">{formatRp(row.cashIn)}</td>
                      <td className="px-5 py-3 text-red-600">{formatRp(row.cashOut)}</td>
                      <td
                        className={`px-5 py-3 ${row.netChange >= 0 ? "text-gray-700" : "text-red-600"}`}
                      >
                        {formatRp(row.netChange)}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{formatRp(row.closingBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
