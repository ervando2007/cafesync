import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import {
  getCategories,
  getRecentMovements,
  getStockItems,
  getUnits,
  summarizeStockItems,
} from "@/lib/inventory";
import { getAccounts } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { ItemsTable } from "@/app/ui/inventory/items-table";
import { BoxIcon, WalletIcon } from "@/app/ui/dashboard/icons";
import { AlertTriangleIcon } from "@/app/ui/inventory/icons";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { PageHeader } from "@/app/ui/page-header";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function movementLabels(t: TranslateFn): Record<string, string> {
  return {
    PURCHASE_IN: t("inventory.movementPurchaseIn"),
    WASTE_OUT: t("inventory.movementWasteOut"),
    ADJUSTMENT_IN: t("inventory.movementAdjustmentIn"),
    ADJUSTMENT_OUT: t("inventory.movementAdjustmentOut"),
    TRANSFER_IN: t("inventory.movementTransferIn"),
    TRANSFER_OUT: t("inventory.movementTransferOut"),
    SALE_OUT: t("inventory.movementSale"),
    RETURN_IN: t("inventory.movementReturn"),
  };
}

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const { t } = await getT();
  const MOVEMENT_LABEL = movementLabels(t);
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const [items, movements, units, categories, accounts] = await Promise.all([
    getStockItems(selectedOutletId),
    getRecentMovements(selectedOutletId),
    getUnits(),
    getCategories(),
    getAccounts(),
  ]);
  const summary = summarizeStockItems(items);
  const expenseAccounts = accounts.filter((a) => a.accountType === "EXPENSE");

  return (
    <>
      <PageHeader eyebrow={t("nav.inventory")} title={t("inventory.itemsTitle")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryStatCard
          label={t("inventory.totalItems")}
          value={String(summary.totalItems)}
          caption={t("inventory.activeInventoryItems")}
          icon={BoxIcon}
          accent="blue"
        />
        <InventoryStatCard
          label={t("inventory.totalStockValue")}
          value={formatRp(summary.totalStockValue)}
          caption={t("inventory.basedOnAverageCost")}
          icon={WalletIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label={t("inventory.lowStockItems")}
          value={String(summary.lowStockCount)}
          caption={t("inventory.requiringAttention")}
          icon={AlertTriangleIcon}
          accent="amber"
        />
        <InventoryStatCard
          label={t("inventory.outOfStock")}
          value={String(summary.outOfStockCount)}
          caption={t("inventory.outOfStockItems")}
          icon={AlertTriangleIcon}
          accent="red"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <ItemsTable items={items} units={units} categories={categories} expenseAccounts={expenseAccounts} />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("inventory.recentTransactions")}</h2>
          {movements.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-400">{t("inventory.noTransactionsYet")}</p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                    </p>
                    <p className="truncate text-xs text-gray-400">{m.itemName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">{m.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
