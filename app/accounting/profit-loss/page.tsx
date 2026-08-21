import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getProfitAndLoss } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { DollarSignIcon, ReceiptIcon, TrendingUpIcon } from "@/app/ui/dashboard/icons";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

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

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string }>;
}) {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const from = params.from ?? firstDayOfMonth();
  const to = params.to ?? today();

  const report = await getProfitAndLoss(selectedOutletId, from, to);
  const margin = report.totalRevenue > 0 ? (report.netProfit / report.totalRevenue) * 100 : 0;

  return (
    <>
      <PageHeader eyebrow={t("nav.accounting")} title={t("nav.profitLoss")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InventoryStatCard
          label={t("accounting.totalRevenue")}
          value={formatRp(report.totalRevenue)}
          caption={t("inventory.inSelectedPeriod")}
          icon={DollarSignIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label={t("accounting.totalExpenses")}
          value={formatRp(report.totalExpenses)}
          caption={t("accounting.includingCogs")}
          icon={ReceiptIcon}
          accent="red"
        />
        <InventoryStatCard
          label={t("accounting.netProfit")}
          value={formatRp(report.netProfit)}
          caption={t("accounting.marginPercent", { pct: margin.toFixed(1) })}
          icon={TrendingUpIcon}
          accent={report.netProfit >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("accounting.revenue")}</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {report.revenue.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-center text-gray-400">{t("accounting.noRevenueInPeriod")}</td>
              </tr>
            ) : (
              report.revenue.map((line) => (
                <tr key={line.accountId} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-700">
                    {line.accountCode} — {line.accountName}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                    {formatRp(line.amount)}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t border-gray-200 bg-gray-50/60">
              <td className="px-5 py-2.5 font-semibold text-gray-900">{t("accounting.totalRevenue")}</td>
              <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                {formatRp(report.totalRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("accounting.expenses")}</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {report.expenses.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-center text-gray-400">{t("accounting.noExpensesInPeriod")}</td>
              </tr>
            ) : (
              report.expenses.map((line) => (
                <tr key={line.accountId} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-700">
                    {line.accountCode} — {line.accountName}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                    {formatRp(line.amount)}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t border-gray-200 bg-gray-50/60">
              <td className="px-5 py-2.5 font-semibold text-gray-900">{t("accounting.totalExpenses")}</td>
              <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                {formatRp(report.totalExpenses)}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-5 py-3 text-base font-bold text-gray-900">{t("accounting.netProfit")}</td>
              <td
                className={`px-5 py-3 text-right text-base font-bold ${
                  report.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatRp(report.netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
