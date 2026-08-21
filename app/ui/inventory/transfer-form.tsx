"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/app/ui/icons";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { transfer } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption } from "@/lib/inventory";

export function TransferForm({
  outlets,
  outletItems,
}: {
  outlets: OutletOption[];
  outletItems: Record<number, StockItemOption[]>;
}) {
  const router = useRouter();
  const [fromOutletId, setFromOutletId] = useState(outlets[0]?.id ?? 0);
  const [toOutletId, setToOutletId] = useState(outlets[1]?.id ?? outlets[0]?.id ?? 0);
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableItems = outletItems[fromOutletId] ?? [];

  function handleFromChange(id: number) {
    setFromOutletId(id);
    setLines([]);
    if (id === toOutletId) {
      const alt = outlets.find((o) => o.id !== id);
      if (alt) setToOutletId(alt.id);
    }
  }

  function handleSubmit() {
    setMessage(null);
    if (fromOutletId === toOutletId) {
      setMessage({ type: "error", text: "Source and destination outlet must be different." });
      return;
    }
    if (lines.length === 0) {
      setMessage({ type: "error", text: "Add at least one item." });
      return;
    }
    if (lines.some((l) => l.qty <= 0)) {
      setMessage({ type: "error", text: "Quantity must be greater than zero." });
      return;
    }

    startTransition(async () => {
      const result = await transfer({
        fromOutletId,
        toOutletId,
        items: lines.map((l) => ({ stockItemId: l.stockItemId, qty: l.qty })),
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      setLines([]);
      setMessage({ type: "info", text: "Transfer saved successfully." });
      router.refresh();
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <div>
        <p className="text-xs font-medium text-gray-400">Inventory</p>
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-gray-500">From Outlet</label>
          <div className="relative mt-1">
            <select
              value={fromOutletId}
              onChange={(e) => handleFromChange(Number(e.target.value))}
              className="appearance-none rounded-lg border border-gray-200 py-2.5 pl-3 pr-8 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <span className="pb-2.5 text-gray-300">→</span>

        <div>
          <label className="text-xs text-gray-500">To Outlet</label>
          <div className="relative mt-1">
            <select
              value={toOutletId}
              onChange={(e) => setToOutletId(Number(e.target.value))}
              className="appearance-none rounded-lg border border-gray-200 py-2.5 pl-3 pr-8 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
            >
              {outlets
                .filter((o) => o.id !== fromOutletId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <LineItemEditor
          mode="transfer"
          availableItems={availableItems}
          lines={lines}
          onChange={setLines}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || outlets.length < 2}
          className="rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Transfer"}
        </button>
      </div>

      {outlets.length < 2 && (
        <p className="mt-3 text-sm text-gray-400">
          You need access to at least two outlets to transfer stock.
        </p>
      )}
    </div>
  );
}
