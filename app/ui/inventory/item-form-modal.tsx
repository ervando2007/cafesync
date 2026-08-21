"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { CategoryManagerModal } from "@/app/ui/inventory/category-manager-modal";
import { createStockItem, updateStockItem } from "@/app/inventory/actions";
import type { CategoryOption, StockItemRow, UnitOption } from "@/lib/inventory";

export function ItemFormModal({
  mode,
  item,
  units,
  categories,
  onClose,
}: {
  mode: "create" | "edit";
  item?: StockItemRow;
  units: UnitOption[];
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [sku, setSku] = useState(item?.sku ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [unitId, setUnitId] = useState(item?.unitId ?? units[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? 0);
  const [reorderLevel, setReorderLevel] = useState(item?.reorderLevel ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectableCategories = useMemo(() => {
    const active = categories.filter((c) => c.status === "ACTIVE");
    if (item && !active.some((c) => c.id === item.categoryId)) {
      const current = categories.find((c) => c.id === item.categoryId);
      if (current) return [current, ...active];
    }
    return active;
  }, [categories, item]);

  const effectiveCategoryId = categoryId || selectableCategories[0]?.id || 0;

  function handleSubmit() {
    setError(null);
    const input = { sku, name, unitId, categoryId: effectiveCategoryId, reorderLevel };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createStockItem(input)
          : await updateStockItem({ ...input, id: item!.stockItemId });

      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "Add Item" : "Edit Item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. RM-COF-001"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Item Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arabica Coffee Beans"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">Category</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(true)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  Manage
                </button>
              </div>
              <select
                value={effectiveCategoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {selectableCategories.length === 0 && <option value={0}>No categories</option>}
                {selectableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Reorder Level</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Item is flagged &ldquo;Low Stock&rdquo; when quantity on hand falls to or below this level.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || units.length === 0 || selectableCategories.length === 0}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Item"}
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
