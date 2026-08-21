"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import {
  RecipeIngredientEditor,
  type IngredientLine,
} from "@/app/ui/inventory/recipe-ingredient-editor";
import { createRecipe, updateRecipe } from "@/app/inventory/recipe-actions";
import type { RecipeableProduct } from "@/lib/recipes";
import type { RecipeIngredientRow } from "@/lib/recipes";
import type { StockItemOption } from "@/lib/inventory";

export function RecipeFormModal({
  mode,
  outletId,
  recipe,
  products,
  availableItems,
  onClose,
}: {
  mode: "create" | "edit";
  outletId: number;
  recipe?: { recipeId: number; productName: string; yieldQty: number; ingredients: RecipeIngredientRow[] };
  products: RecipeableProduct[];
  availableItems: StockItemOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const creatableProducts = products.filter((p) => !p.hasRecipe);
  const [productId, setProductId] = useState<number>(creatableProducts[0]?.productId ?? 0);
  const [yieldQty, setYieldQty] = useState<number>(recipe?.yieldQty ?? 1);
  const [lines, setLines] = useState<IngredientLine[]>(
    recipe
      ? recipe.ingredients.map((i) => ({
          stockItemId: i.stockItemId,
          stockItemName: i.stockItemName,
          qty: i.qty,
          unitId: i.unitId,
          unitName: i.unitName,
          avgCost: i.avgCost,
        }))
      : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (lines.some((l) => l.qty <= 0)) {
      setError("Every ingredient needs a quantity greater than zero.");
      return;
    }

    const items = lines.map((l) => ({ stockItemId: l.stockItemId, qty: l.qty, unitId: l.unitId }));

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRecipe({ outletId, productId, yieldQty, items })
          : await updateRecipe({ outletId, recipeId: recipe!.recipeId, yieldQty, items });

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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "New Recipe" : `Edit Recipe — ${recipe?.productName}`}
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

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Product</label>
            {mode === "create" ? (
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {creatableProducts.length === 0 && <option value={0}>No products available</option>}
                {creatableProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {recipe?.productName}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500">Yield (servings)</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={yieldQty}
              onChange={(e) => setYieldQty(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <RecipeIngredientEditor availableItems={availableItems} lines={lines} onChange={setLines} />
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
            disabled={isPending || (mode === "create" && creatableProducts.length === 0)}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
