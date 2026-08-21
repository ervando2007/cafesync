import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import {
  getHppByCategory,
  getHppByRecipe,
  getHppSummary,
  getTopCostIngredients,
} from "@/lib/hpp";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { HppCategoryDonut } from "@/app/ui/inventory/hpp-category-donut";
import {
  DollarSignIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/app/ui/dashboard/icons";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

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

export default async function HppPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
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
  const fromDateTime = `${from} 00:00:00`;
  const toDateTime = `${to} 23:59:59`;

  const [summary, byRecipe, byCategory, topIngredients] = await Promise.all([
    getHppSummary(selectedOutletId, fromDateTime, toDateTime),
    getHppByRecipe(selectedOutletId, fromDateTime, toDateTime),
    getHppByCategory(selectedOutletId, fromDateTime, toDateTime),
    getTopCostIngredients(selectedOutletId, fromDateTime, toDateTime, 5),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("nav.inventory")} title={t("inventory.hppPageTitle")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <InventoryStatCard
          label={t("inventory.totalHpp")}
          value={formatRp(summary.totalHpp)}
          caption={t("inventory.itemsSold", { count: summary.totalQtySold })}
          icon={DollarSignIcon}
          accent="amber"
        />
        <InventoryStatCard
          label={t("inventory.averageHppPerItem")}
          value={formatRp(summary.averageHppPerItem)}
          caption={t("inventory.perUnitSold")}
          icon={ReceiptIcon}
          accent="blue"
        />
        <InventoryStatCard
          label={t("inventory.hppPercentage")}
          value={`${summary.hppPercentage.toFixed(1)}%`}
          caption={t("inventory.ofTotalSales")}
          icon={ShoppingCartIcon}
          accent="red"
        />
        <InventoryStatCard
          label={t("inventory.totalSales")}
          value={formatRp(summary.totalSales)}
          caption={t("inventory.inSelectedPeriod")}
          icon={WalletIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label={t("inventory.grossProfit")}
          value={formatRp(summary.grossProfit)}
          caption={t("inventory.salesMinusHpp")}
          icon={TrendingUpIcon}
          accent="emerald"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900">{t("inventory.hppByRecipe")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">{t("inventory.colRecipe")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colCategory")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colQtySold")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colTotalCost")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colHppServing")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colSales")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colGrossProfit")}</th>
                  <th className="px-5 py-3 font-medium">{t("inventory.colHppPercent")}</th>
                </tr>
              </thead>
              <tbody>
                {byRecipe.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("inventory.noSalesInPeriod")}
                    </td>
                  </tr>
                ) : (
                  byRecipe.map((row) => (
                    <tr key={row.productId} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-900">{row.productName}</td>
                      <td className="px-5 py-3 text-gray-500">{row.categoryName ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{row.totalQtySold}</td>
                      <td className="px-5 py-3 text-gray-700">{formatRp(row.totalHpp)}</td>
                      <td className="px-5 py-3 text-gray-700">{formatRp(row.hppPerServing)}</td>
                      <td className="px-5 py-3 text-gray-700">{formatRp(row.totalSales)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {formatRp(row.grossProfit)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{row.hppPercentage.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <HppCategoryDonut data={byCategory} />

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">{t("inventory.topCostIngredients")}</h2>
            {topIngredients.length === 0 ? (
              <p className="mt-6 text-center text-sm text-gray-400">{t("inventory.noDataInPeriod")}</p>
            ) : (
              <ol className="mt-4 space-y-2.5">
                {topIngredients.map((ing, i) => (
                  <li key={ing.stockItemId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {i + 1}. {ing.stockItemName}
                    </span>
                    <span className="font-medium text-gray-900">{formatRp(ing.totalCost)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
