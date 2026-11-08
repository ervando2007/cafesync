"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { UtensilsIcon } from "@/app/ui/dashboard/icons";
import { ChevronLeftIcon, PlusIcon, SearchIcon, SlidersIcon } from "@/app/ui/pos/icons";
import type { CatalogProduct } from "@/lib/pos";
import { ChevronRightIcon } from "@/app/ui/dashboard/icons";
import { useI18n } from "@/app/i18n-provider";

const ALL_ITEMS = "All Items";

const PAGE_SIZE = 12;

function formatRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function ProductGrid({
  catalog,
  onAddToCart,
}: {
  catalog: CatalogProduct[];
  onAddToCart: (product: CatalogProduct) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_ITEMS);
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const names = Array.from(new Set(catalog.map((p) => p.categoryName)));
    return [ALL_ITEMS, ...names];
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((p) => {
      const matchesCategory = category === ALL_ITEMS || p.categoryName === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [catalog, category, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleCategory(next: string) {
    setCategory(next);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("pos.searchMenu")}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <button
          type="button"
          aria-label={t("pos.filter")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <SlidersIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-40 shrink-0 space-y-1 overflow-y-auto border-r border-gray-100 p-3">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCategory(name)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                category === name
                  ? "bg-amber-700 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {name === ALL_ITEMS ? t("pos.allItems") : name}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-5">
          {pageItems.length === 0 ? (
            <p className="m-auto text-sm text-gray-400">{t("pos.noMenuItemsMatch")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((product) => {
                const Icon = product.productType === "BEVERAGE" ? CoffeeCupIcon : UtensilsIcon;
                const isOut = product.stockStatus === "OUT";
                const isLow = product.stockStatus === "LOW";
                const stockHint =
                  product.stockIngredients.length > 0
                    ? t("pos.stockIngredientsHint", { items: product.stockIngredients.join(", ") })
                    : undefined;
                return (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => onAddToCart(product)}
                    disabled={isOut}
                    title={stockHint}
                    className={`group relative flex flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition ${
                      isOut
                        ? "cursor-not-allowed border-gray-100 opacity-50 grayscale"
                        : isLow
                          ? "border-amber-300 hover:shadow-md"
                          : "border-gray-100 hover:border-amber-200 hover:shadow-md"
                    }`}
                  >
                    <span className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-amber-50 text-amber-700">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <Icon className="h-8 w-8" />
                      )}
                      {(isOut || isLow) && (
                        <span
                          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isOut ? "bg-gray-800 text-white" : "bg-amber-500 text-white"
                          }`}
                        >
                          {isOut ? t("pos.stockOut") : t("pos.stockLow")}
                        </span>
                      )}
                    </span>
                    <p className="mt-2.5 truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    {isLow && product.portionsLeft != null && (
                      <p className="truncate text-[11px] font-medium text-amber-700">
                        {t("pos.portionsLeft", { count: product.portionsLeft })}
                      </p>
                    )}
                    {isOut && (
                      <p className="truncate text-[11px] font-medium text-gray-500">
                        {product.noRecipe ? t("pos.noRecipeYet") : t("pos.cannotBeOrdered")}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatRp(product.sellingPrice)}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition ${
                          isOut ? "bg-gray-300" : "bg-amber-700 group-hover:bg-amber-800"
                        }`}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-6 py-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                n === currentPage ? "bg-amber-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
