import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getCashFlowReport } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { DollarSignIcon, TrendingUpIcon, WalletIcon } from "@/app/ui/dashboard/icons";
import { AlertTriangleIcon } from "@/app/ui/inventory/icons";

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

export default async function CashFlowPage({
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

  const report = await getCashFlowReport(selectedOutletId, `${from} 00:00:00`, `${to} 23:59:59`);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Accounting</p>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
          <DateRangeSelect from={from} to={to} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryStatCard
          label="Opening Balance"
          value={formatRp(report.openingBalance)}
          caption="Before selected period"
          icon={WalletIcon}
          accent="blue"
        />
        <InventoryStatCard
          label="Cash In"
          value={formatRp(report.cashIn)}
          caption="In selected period"
          icon={TrendingUpIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label="Cash Out"
          value={formatRp(report.cashOut)}
          caption="In selected period"
          icon={AlertTriangleIcon}
          accent="red"
        />
        <InventoryStatCard
          label="Closing Balance"
          value={formatRp(report.closingBalance)}
          caption="End of selected period"
          icon={DollarSignIcon}
          accent="amber"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm text-gray-500">Opening Balance</span>
          <span className="font-medium text-gray-900">{formatRp(report.openingBalance)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
          <span className="text-sm text-gray-500">+ Cash In</span>
          <span className="font-medium text-emerald-600">{formatRp(report.cashIn)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
          <span className="text-sm text-gray-500">− Cash Out</span>
          <span className="font-medium text-red-600">{formatRp(report.cashOut)}</span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <span className="text-base font-semibold text-gray-900">Closing Balance</span>
          <span className="text-xl font-bold text-amber-700">
            {formatRp(report.closingBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
