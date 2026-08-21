import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getProfitAndLoss } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { DollarSignIcon, ReceiptIcon, TrendingUpIcon } from "@/app/ui/dashboard/icons";

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
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Accounting</p>
          <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
          <DateRangeSelect from={from} to={to} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InventoryStatCard
          label="Total Revenue"
          value={formatRp(report.totalRevenue)}
          caption="In selected period"
          icon={DollarSignIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label="Total Expenses"
          value={formatRp(report.totalExpenses)}
          caption="Including COGS"
          icon={ReceiptIcon}
          accent="red"
        />
        <InventoryStatCard
          label="Net Profit"
          value={formatRp(report.netProfit)}
          caption={`${margin.toFixed(1)}% margin`}
          icon={TrendingUpIcon}
          accent={report.netProfit >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900">Revenue</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {report.revenue.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-center text-gray-400">No revenue in this period.</td>
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
              <td className="px-5 py-2.5 font-semibold text-gray-900">Total Revenue</td>
              <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                {formatRp(report.totalRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900">Expenses</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {report.expenses.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-center text-gray-400">No expenses in this period.</td>
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
              <td className="px-5 py-2.5 font-semibold text-gray-900">Total Expenses</td>
              <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                {formatRp(report.totalExpenses)}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-5 py-3 text-base font-bold text-gray-900">Net Profit</td>
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
  );
}
