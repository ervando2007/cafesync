"use client";

import { useState } from "react";
import { PlusIcon, SearchIcon, TrashIcon } from "@/app/ui/pos/icons";
import type { StockItemOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";

export interface EditorLine {
  stockItemId: number;
  name: string;
  unitName: string;
  systemQty: number;
  qty: number;
  unitCost: number;
}

export type EditorMode = "stock-in" | "stock-out" | "adjustment" | "transfer";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function LineItemEditor({
  mode,
  availableItems,
  lines,
  onChange,
}: {
  mode: EditorMode;
  availableItems: StockItemOption[];
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const pickable = availableItems.filter(
    (item) =>
      !lines.some((l) => l.stockItemId === item.stockItemId) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function addItem(item: StockItemOption) {
    const isAdjustment = mode === "adjustment";
    onChange([
      ...lines,
      {
        stockItemId: item.stockItemId,
        name: item.name,
        unitName: item.unitName,
        systemQty: item.qtyOnHand,
        qty: isAdjustment ? item.qtyOnHand : 0,
        unitCost: mode === "stock-in" ? item.avgCost : item.avgCost,
      },
    ]);
    setSearch("");
    setShowPicker(false);
  }

  function updateLine(stockItemId: number, patch: Partial<EditorLine>) {
    onChange(lines.map((l) => (l.stockItemId === stockItemId ? { ...l, ...patch } : l)));
  }

  function removeLine(stockItemId: number) {
    onChange(lines.filter((l) => l.stockItemId !== stockItemId));
  }

  const qtyColumnLabel = mode === "adjustment" ? t("inventory.colActualQty") : t("inventory.colQty");

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("inventory.itemsTitle")}</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("inventory.addItem")}
          </button>

          {showPicker && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("inventory.searchItemPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto">
                {pickable.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">{t("inventory.noItemsFound")}</p>
                ) : (
                  pickable.map((item) => (
                    <button
                      key={item.stockItemId}
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-amber-50"
                    >
                      <span>
                        <span className="block font-medium text-gray-900">{item.name}</span>
                        <span className="block text-xs text-gray-400">
                          {t("inventory.onHandSuffix", { qty: item.qtyOnHand, unit: item.unitName })}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">{t("inventory.noItemsAddedYet")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 font-medium">{t("inventory.colItem")}</th>
                <th className="pb-2 font-medium">{t("inventory.colUnit")}</th>
                {mode === "adjustment" && <th className="pb-2 font-medium">{t("inventory.colSystemQty")}</th>}
                <th className="pb-2 font-medium">{qtyColumnLabel}</th>
                {mode === "stock-in" && <th className="pb-2 font-medium">{t("inventory.colUnitCost")}</th>}
                {(mode === "stock-in" || mode === "adjustment") && (
                  <th className="pb-2 font-medium">{t("inventory.colTotal")}</th>
                )}
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const diff = line.qty - line.systemQty;
                const total =
                  mode === "stock-in"
                    ? line.qty * line.unitCost
                    : mode === "adjustment"
                      ? diff * line.unitCost
                      : 0;
                return (
                  <tr key={line.stockItemId} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{line.name}</td>
                    <td className="py-2.5 text-gray-500">{line.unitName}</td>
                    {mode === "adjustment" && (
                      <td className="py-2.5 text-gray-500">{line.systemQty}</td>
                    )}
                    <td className="py-2.5">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.stockItemId, { qty: Number(e.target.value) })
                        }
                        className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    {mode === "stock-in" && (
                      <td className="py-2.5">
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(line.stockItemId, { unitCost: Number(e.target.value) })
                          }
                          className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right focus:border-amber-500 focus:outline-none"
                        />
                      </td>
                    )}
                    {(mode === "stock-in" || mode === "adjustment") && (
                      <td
                        className={`py-2.5 text-right font-medium ${
                          mode === "adjustment" && diff < 0 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {mode === "adjustment" && diff !== 0 ? (diff > 0 ? "+" : "") : ""}
                        {formatRp(total)}
                      </td>
                    )}
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(line.stockItemId)}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
