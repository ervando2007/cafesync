import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getCashFlowReport } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { DollarSignIcon, TrendingUpIcon, WalletIcon } from "@/app/ui/dashboard/icons";
import { AlertTriangleIcon } from "@/app/ui/inventory/icons";
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

export default async function CashFlowPage({
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

  const report = await getCashFlowReport(selectedOutletId, `${from} 00:00:00`, `${to} 23:59:59`);

  return (
    <>
      <PageHeader eyebrow={t("nav.accounting")} title={t("nav.cashFlow")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryStatCard
          label={t("dashboard.openingBalance")}
          value={formatRp(report.openingBalance)}
          caption={t("accounting.beforeSelectedPeriod")}
          icon={WalletIcon}
          accent="blue"
        />
        <InventoryStatCard
          label={t("dashboard.cashIn")}
          value={formatRp(report.cashIn)}
          caption={t("inventory.inSelectedPeriod")}
          icon={TrendingUpIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label={t("dashboard.cashOut")}
          value={formatRp(report.cashOut)}
          caption={t("inventory.inSelectedPeriod")}
          icon={AlertTriangleIcon}
          accent="red"
        />
        <InventoryStatCard
          label={t("dashboard.closingBalance")}
          value={formatRp(report.closingBalance)}
          caption={t("accounting.endOfSelectedPeriod")}
          icon={DollarSignIcon}
          accent="amber"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm text-gray-500">{t("dashboard.openingBalance")}</span>
          <span className="font-medium text-gray-900">{formatRp(report.openingBalance)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
          <span className="text-sm text-gray-500">{t("accounting.plusCashIn")}</span>
          <span className="font-medium text-emerald-600">{formatRp(report.cashIn)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
          <span className="text-sm text-gray-500">{t("accounting.minusCashOut")}</span>
          <span className="font-medium text-red-600">{formatRp(report.cashOut)}</span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <span className="text-base font-semibold text-gray-900">{t("dashboard.closingBalance")}</span>
          <span className="text-xl font-bold text-amber-700">
            {formatRp(report.closingBalance)}
          </span>
        </div>
      </div>
      </div>
    </>
  );
}
