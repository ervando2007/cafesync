"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { SupplierManagerModal } from "@/app/ui/inventory/supplier-manager-modal";
import { stockIn } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption, SupplierRecord } from "@/lib/inventory";

export function StockInForm({
  outlets,
  outletItems,
  suppliers,
  selectedOutletId,
}: {
  outlets: OutletOption[];
  outletItems: Record<number, StockItemOption[]>;
  suppliers: SupplierRecord[];
  selectedOutletId: number;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === "ACTIVE"),
    [suppliers],
  );
  const availableItems = outletItems[selectedOutletId] ?? [];
  const totalValue = lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

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
      const result = await stockIn({
        outletId: selectedOutletId,
        supplierId: supplierId ? Number(supplierId) : null,
        notes,
        items: lines.map((l) => ({ stockItemId: l.stockItemId, qty: l.qty, unitCost: l.unitCost })),
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      setLines([]);
      setNotes("");
      setSupplierId("");
      setMessage({ type: "info", text: "Stock in saved successfully." });
      router.refresh();
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Stock In</h1>
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
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Purchase From (Supplier)</label>
            <button
              type="button"
              onClick={() => setShowSupplierManager(true)}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              Manage
            </button>
          </div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">No supplier / other</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Notes / Remarks</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Weekly raw material purchase"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <LineItemEditor
          mode="stock-in"
          availableItems={availableItems}
          lines={lines}
          onChange={setLines}
        />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs text-gray-500">Total Value</p>
          <p className="text-xl font-bold text-amber-700">
            Rp {Math.round(totalValue).toLocaleString("id-ID")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Stock In"}
        </button>
      </div>

      {showSupplierManager && (
        <SupplierManagerModal
          suppliers={suppliers}
          onClose={() => setShowSupplierManager(false)}
        />
      )}
    </div>
  );
}
