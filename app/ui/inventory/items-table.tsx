"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, PlusIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { ItemFormModal } from "@/app/ui/inventory/item-form-modal";
import { CategoryManagerModal } from "@/app/ui/inventory/category-manager-modal";
import { setStockItemStatus } from "@/app/inventory/actions";
import type { CategoryOption, StockItemRow, StockStatus, UnitOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function statusLabels(t: TranslateFn): Record<StockStatus, string> {
  return {
    IN_STOCK: t("inventory.statusInStock"),
    LOW_STOCK: t("inventory.statusLowStock"),
    OUT_OF_STOCK: t("inventory.statusOutOfStock"),
  };
}

const STATUS_CLASSES: Record<StockStatus, string> = {
  IN_STOCK: "bg-emerald-50 text-emerald-700",
  LOW_STOCK: "bg-amber-50 text-amber-700",
  OUT_OF_STOCK: "bg-red-50 text-red-600",
};

export function ItemsTable({
  items,
  units,
  categories,
}: {
  items: StockItemRow[];
  units: UnitOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const STATUS_LABEL = statusLabels(t);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | StockStatus | "INACTIVE">("ALL");
  const [modalItem, setModalItem] = useState<StockItemRow | "new" | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categoryNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.categoryName))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "ALL" || item.categoryName === categoryFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "INACTIVE"
          ? item.itemStatus === "INACTIVE"
          : item.status === statusFilter && item.itemStatus === "ACTIVE");
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  function toggleStatus(item: StockItemRow) {
    const nextStatus = item.itemStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setStockItemStatus({ id: item.stockItemId, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("inventory.searchItemSku")}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">{t("inventory.allCategories")}</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | StockStatus | "INACTIVE")}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">{t("inventory.allStatus")}</option>
          <option value="IN_STOCK">{t("inventory.statusInStock")}</option>
          <option value="LOW_STOCK">{t("inventory.statusLowStock")}</option>
          <option value="OUT_OF_STOCK">{t("inventory.statusOutOfStock")}</option>
          <option value="INACTIVE">{t("inventory.statusInactive")}</option>
        </select>
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {t("inventory.categoriesButton")}
        </button>
        <button
          type="button"
          onClick={() => setModalItem("new")}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t("inventory.addItem")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("inventory.colItem")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colCategory")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colSku")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colUnit")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStockOnHand")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colUnitCostAvg")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStockValue")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">
                  {t("inventory.noItemsMatchFilters")}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.stockItemId}
                  className={`border-b border-gray-50 last:border-0 ${
                    item.itemStatus === "INACTIVE" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-5 py-3 text-gray-500">{item.categoryName}</td>
                  <td className="px-5 py-3 text-gray-500">{item.sku}</td>
                  <td className="px-5 py-3 text-gray-500">{item.unitName}</td>
                  <td className="px-5 py-3 text-gray-700">{item.qtyOnHand}</td>
                  <td className="px-5 py-3 text-gray-700">{formatRp(item.avgCost)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {formatRp(item.stockValue)}
                  </td>
                  <td className="px-5 py-3">
                    {item.itemStatus === "INACTIVE" ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        {t("inventory.statusInactive")}
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setModalItem(item)}
                        className="text-gray-400 hover:text-amber-700"
                        aria-label={t("inventory.editAriaLabel", { name: item.name })}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                      >
                        {item.itemStatus === "ACTIVE" ? t("common.deactivate") : t("common.activate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalItem && (
        <ItemFormModal
          mode={modalItem === "new" ? "create" : "edit"}
          item={modalItem === "new" ? undefined : modalItem}
          units={units}
          categories={categories}
          onClose={() => setModalItem(null)}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
