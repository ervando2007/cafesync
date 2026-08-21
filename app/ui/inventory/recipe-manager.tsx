"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusIcon, SearchIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { RecipeFormModal } from "@/app/ui/inventory/recipe-form-modal";
import { setRecipeStatus } from "@/app/inventory/recipe-actions";
import type { RecipeableProduct, RecipeIngredientRow, RecipeListRow } from "@/lib/recipes";
import type { StockItemOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function RecipeManager({
  outletId,
  recipes,
  ingredientsByRecipe,
  products,
  availableItems,
}: {
  outletId: number;
  recipes: RecipeListRow[];
  ingredientsByRecipe: Record<number, RecipeIngredientRow[]>;
  products: RecipeableProduct[];
  availableItems: StockItemOption[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(recipes[0]?.recipeId ?? null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "ingredients">("info");
  const [isPending, startTransition] = useTransition();

  const categoryNames = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.categoryName).filter(Boolean))),
    [recipes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesSearch =
        !q || r.productName.toLowerCase().includes(q) || r.productSku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "ALL" || r.categoryName === categoryFilter;
      const matchesStatus =
        statusFilter === "ALL" || (statusFilter === "ACTIVE" ? r.isActive : !r.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [recipes, search, categoryFilter, statusFilter]);

  const selected = recipes.find((r) => r.recipeId === selectedId) ?? recipes[0] ?? null;
  const selectedIngredients = selected ? (ingredientsByRecipe[selected.recipeId] ?? []) : [];

  function toggleStatus(recipe: RecipeListRow) {
    startTransition(async () => {
      await setRecipeStatus({ recipeId: recipe.recipeId, outletId, isActive: !recipe.isActive });
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("inventory.searchRecipePlaceholder")}
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
              <option key={c} value={c as string}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">{t("inventory.allStatus")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="INACTIVE">{t("common.inactive")}</option>
          </select>
          <button
            type="button"
            onClick={() => setModalMode("create")}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("inventory.newRecipe")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="px-5 py-3 font-medium">{t("inventory.colRecipe")}</th>
                <th className="px-5 py-3 font-medium">{t("inventory.colCategory")}</th>
                <th className="px-5 py-3 font-medium">{t("inventory.colYield")}</th>
                <th className="px-5 py-3 font-medium">{t("inventory.colTotalCost")}</th>
                <th className="px-5 py-3 font-medium">{t("inventory.colCostServing")}</th>
                <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    {t("inventory.noRecipesMatchFilters")}
                  </td>
                </tr>
              ) : (
                filtered.map((recipe) => (
                  <tr
                    key={recipe.recipeId}
                    onClick={() => {
                      setSelectedId(recipe.recipeId);
                      setDetailTab("info");
                    }}
                    className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-amber-50/50 ${
                      selectedId === recipe.recipeId ? "bg-amber-50" : ""
                    } ${!recipe.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                          {recipe.productImageUrl && (
                            <Image
                              src={recipe.productImageUrl}
                              alt=""
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{recipe.productName}</p>
                          <p className="truncate text-xs text-gray-400">{recipe.productSku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{recipe.categoryName ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{t("inventory.servingsCount", { qty: recipe.yieldQty })}</td>
                    <td className="px-5 py-3 text-gray-700">{formatRp(recipe.totalCost)}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatRp(recipe.costPerServing)}
                    </td>
                    <td className="px-5 py-3">
                      {recipe.isActive ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {t("common.active")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                          {t("common.inactive")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(recipe.recipeId);
                            setModalMode("edit");
                          }}
                          className="text-gray-400 hover:text-amber-700"
                          aria-label={t("inventory.editAriaLabel", { name: recipe.productName })}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(recipe)}
                          disabled={isPending}
                          className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                        >
                          {recipe.isActive ? t("common.deactivate") : t("common.activate")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {!selected ? (
          <p className="py-10 text-center text-sm text-gray-400">{t("inventory.selectRecipeToView")}</p>
        ) : (
          <>
            <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-50">
              {selected.productImageUrl && (
                <Image
                  src={selected.productImageUrl}
                  alt=""
                  fill
                  sizes="360px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-gray-900">{selected.productName}</p>
                <p className="text-xs text-gray-400">{selected.productSku}</p>
              </div>
              {selected.isActive ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {t("common.active")}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  {t("common.inactive")}
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-4 border-b border-gray-100 text-sm">
              <button
                type="button"
                onClick={() => setDetailTab("info")}
                className={`border-b-2 pb-2 font-medium ${
                  detailTab === "info"
                    ? "border-amber-700 text-amber-700"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t("inventory.recipeInfo")}
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("ingredients")}
                className={`border-b-2 pb-2 font-medium ${
                  detailTab === "ingredients"
                    ? "border-amber-700 text-amber-700"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t("inventory.ingredientsCount", { count: selectedIngredients.length })}
              </button>
            </div>

            {detailTab === "info" ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.category")}</dt>
                  <dd className="font-medium text-gray-900">{selected.categoryName ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.colYield")}</dt>
                  <dd className="font-medium text-gray-900">{t("inventory.servingsCount", { qty: selected.yieldQty })}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.colTotalCost")}</dt>
                  <dd className="font-medium text-gray-900">{formatRp(selected.totalCost)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.costPerServing")}</dt>
                  <dd className="font-medium text-gray-900">{formatRp(selected.costPerServing)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.sellingPrice")}</dt>
                  <dd className="font-medium text-gray-900">
                    {selected.sellingPrice === null ? t("inventory.notSet") : formatRp(selected.sellingPrice)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">{t("inventory.grossProfit")}</dt>
                  <dd
                    className={`font-medium ${
                      selected.grossProfit !== null && selected.grossProfit < 0
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {selected.grossProfit === null
                      ? "—"
                      : `${formatRp(selected.grossProfit)} (${selected.grossProfitPercent!.toFixed(1)}%)`}
                  </dd>
                </div>
              </dl>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {selectedIngredients.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">{t("inventory.noIngredients")}</p>
                ) : (
                  selectedIngredients.map((ing) => (
                    <li
                      key={ing.stockItemId}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{ing.stockItemName}</p>
                        <p className="text-xs text-gray-400">
                          {ing.qty} {ing.unitName} · {formatRp(ing.avgCost)}/unit
                        </p>
                      </div>
                      <span className="font-medium text-gray-900">{formatRp(ing.lineCost)}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}
      </div>

      {modalMode && (
        <RecipeFormModal
          mode={modalMode}
          outletId={outletId}
          recipe={
            modalMode === "edit" && selected
              ? {
                  recipeId: selected.recipeId,
                  productName: selected.productName,
                  yieldQty: selected.yieldQty,
                  ingredients: selectedIngredients,
                }
              : undefined
          }
          products={products}
          availableItems={availableItems}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
