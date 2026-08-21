"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { adjustment } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption } from "@/lib/inventory";

export function AdjustmentForm({
  outlets,
  outletItems,
  selectedOutletId,
}: {
  outlets: OutletOption[];
  outletItems: Record<number, StockItemOption[]>;
  selectedOutletId: number;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableItems = outletItems[selectedOutletId] ?? [];
  const netChange = lines.reduce((sum, l) => sum + (l.qty - l.systemQty) * l.unitCost, 0);

  function handleSubmit() {
    setMessage(null);
    if (lines.length === 0) {
      setMessage({ type: "error", text: "Add at least one item." });
      return;
    }
    if (lines.some((l) => l.qty < 0)) {
      setMessage({ type: "error", text: "Actual quantity cannot be negative." });
      return;
    }

    startTransition(async () => {
      const result = await adjustment({
        outletId: selectedOutletId,
        notes,
        items: lines.map((l) => ({
          stockItemId: l.stockItemId,
          actualQty: l.qty,
          unitCost: l.unitCost,
        })),
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      setLines([]);
      setNotes("");
      setMessage({ type: "info", text: "Adjustment saved successfully." });
      router.refresh();
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Adjustments</h1>
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

      <div className="mt-6">
        <label className="text-xs text-gray-500">Description / Remarks</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Stock count correction after physical count"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Set each item&apos;s actual counted quantity — the system compares it against current stock
        and posts the difference.
      </p>

      <div className="mt-3">
        <LineItemEditor
          mode="adjustment"
          availableItems={availableItems}
          lines={lines}
          onChange={setLines}
        />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs text-gray-500">Net Adjustment Value</p>
          <p className={`text-xl font-bold ${netChange < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {netChange >= 0 ? "+" : ""}
            Rp {Math.round(netChange).toLocaleString("id-ID")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Adjustment"}
        </button>
      </div>
    </div>
  );
}
