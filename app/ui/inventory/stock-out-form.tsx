"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { stockOut } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption } from "@/lib/inventory";

const REASONS = ["Waste / Spoilage", "Internal Use", "Damaged", "Other"];

export function StockOutForm({
  outlets,
  outletItems,
  selectedOutletId,
}: {
  outlets: OutletOption[];
  outletItems: Record<number, StockItemOption[]>;
  selectedOutletId: number;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableItems = outletItems[selectedOutletId] ?? [];

  function handleSubmit() {
    setMessage(null);
    if (lines.length === 0) {
      setMessage({ type: "error", text: "Add at least one item." });
      return;
    }
    if (lines.some((l) => l.qty <= 0)) {
      setMessage({ type: "error", text: "Quantity must be greater than zero." });
      return;
    }

    startTransition(async () => {
      const result = await stockOut({
        outletId: selectedOutletId,
        reason: `${reason}${notes ? ` - ${notes}` : ""}`,
        notes,
        items: lines.map((l) => ({ stockItemId: l.stockItemId, qty: l.qty })),
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      setLines([]);
      setNotes("");
      setMessage({ type: "info", text: "Stock out saved successfully." });
      router.refresh();
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Stock Out</h1>
        </div>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs text-gray-500">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Notes / Remarks</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Spilled milk during prep"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <LineItemEditor
          mode="stock-out"
          availableItems={availableItems}
          lines={lines}
          onChange={setLines}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Stock Out"}
        </button>
      </div>
    </div>
  );
}
