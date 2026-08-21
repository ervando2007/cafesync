"use client";

import { CoffeeCupIcon } from "@/app/ui/icons";
import { GridIcon, UtensilsIcon } from "@/app/ui/dashboard/icons";
import { SearchIcon } from "@/app/ui/pos/icons";
import { useI18n } from "@/app/i18n-provider";

export function MenuSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  search,
  onSearchChange,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("pos.searchMenu")}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      <div className="space-y-1 rounded-2xl border border-gray-100 bg-white p-2">
        {categories.map((category) => {
          const Icon = category === "All Menu" ? GridIcon : category === "Food" || category === "Pastry" ? UtensilsIcon : CoffeeCupIcon;
          const isActive = category === selectedCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                isActive ? "bg-amber-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {category === "All Menu" ? t("order.allMenu") : category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
