"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { UtensilsIcon } from "@/app/ui/dashboard/icons";
import { HeartIcon } from "@/app/ui/order/icons";
import { PlusIcon } from "@/app/ui/pos/icons";
import { useWishlist } from "@/app/ui/order/use-wishlist";
import type { MenuItem } from "@/lib/customer-menu";

function formatRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

type SortOption = "POPULAR" | "PRICE_ASC" | "PRICE_DESC" | "NAME";

const SORTERS: Record<SortOption, (a: MenuItem, b: MenuItem) => number> = {
  POPULAR: (a, b) => b.popularityScore - a.popularityScore,
  PRICE_ASC: (a, b) => a.sellingPrice - b.sellingPrice,
  PRICE_DESC: (a, b) => b.sellingPrice - a.sellingPrice,
  NAME: (a, b) => a.name.localeCompare(b.name),
};

export function ProductGrid({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
}) {
  const { wishlist, toggle: toggleWishlist } = useWishlist();
  const [sortBy, setSortBy] = useState<SortOption>("POPULAR");

  const sortedItems = useMemo(() => [...items].sort(SORTERS[sortBy]), [items, sortBy]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="POPULAR">Popular</option>
            <option value="PRICE_ASC">Price: Low to High</option>
            <option value="PRICE_DESC">Price: High to Low</option>
            <option value="NAME">Name</option>
          </select>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-400">No menu items match your search.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((item) => {
            const Icon = item.productType === "BEVERAGE" ? CoffeeCupIcon : UtensilsIcon;
            const isWishlisted = wishlist.has(item.productId);
            return (
              <div
                key={item.productId}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative flex h-32 items-center justify-center overflow-hidden bg-amber-50 text-amber-700">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="240px" className="object-cover" />
                  ) : (
                    <Icon className="h-12 w-12" />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(item.productId)}
                    aria-label="Toggle wishlist"
                    className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition ${
                      isWishlisted ? "text-red-500" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <HeartIcon className="h-4 w-4" filled={isWishlisted} />
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{item.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-bold text-gray-900">
                      {formatRp(item.sellingPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdd(item)}
                      className="flex items-center gap-1 rounded-full bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
