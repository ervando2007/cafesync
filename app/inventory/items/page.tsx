import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import {
  getCategories,
  getRecentMovements,
  getStockItems,
  getUnits,
  summarizeStockItems,
} from "@/lib/inventory";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { InventoryStatCard } from "@/app/ui/inventory/stat-card";
import { ItemsTable } from "@/app/ui/inventory/items-table";
import { BoxIcon, WalletIcon } from "@/app/ui/dashboard/icons";
import { AlertTriangleIcon } from "@/app/ui/inventory/icons";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE_IN: "Stock In",
  WASTE_OUT: "Stock Out",
  ADJUSTMENT_IN: "Adjustment (+)",
  ADJUSTMENT_OUT: "Adjustment (-)",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  SALE_OUT: "Sale",
  RETURN_IN: "Return",
};

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const [items, movements, units, categories] = await Promise.all([
    getStockItems(selectedOutletId),
    getRecentMovements(selectedOutletId),
    getUnits(),
    getCategories(),
  ]);
  const summary = summarizeStockItems(items);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        </div>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryStatCard
          label="Total Items"
          value={String(summary.totalItems)}
          caption="Active inventory items"
          icon={BoxIcon}
          accent="blue"
        />
        <InventoryStatCard
          label="Total Stock Value"
          value={formatRp(summary.totalStockValue)}
          caption="Based on average cost"
          icon={WalletIcon}
          accent="emerald"
        />
        <InventoryStatCard
          label="Low Stock Items"
          value={String(summary.lowStockCount)}
          caption="Requiring attention"
          icon={AlertTriangleIcon}
          accent="amber"
        />
        <InventoryStatCard
          label="Out of Stock"
          value={String(summary.outOfStockCount)}
          caption="Out of stock items"
          icon={AlertTriangleIcon}
          accent="red"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <ItemsTable items={items} units={units} categories={categories} />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Recent Transactions</h2>
          {movements.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-400">No transactions yet.</p>
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
  );
}
