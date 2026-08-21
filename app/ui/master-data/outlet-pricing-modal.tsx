"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { removeOutletProduct, upsertOutletProduct } from "@/app/master-data/actions";
import type { OutletPriceRow } from "@/lib/products";

function OutletPriceRowEditor({
  productId,
  row,
}: {
  productId: number;
  row: OutletPriceRow;
}) {
  const router = useRouter();
  const [sellingPrice, setSellingPrice] = useState(row.sellingPrice ?? 0);
  const [taxRatePercent, setTaxRatePercent] = useState((row.taxRate ?? 0.1) * 100);
  const [isAvailable, setIsAvailable] = useState(row.isAvailable);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertOutletProduct({
        outletId: row.outletId,
        productId,
        sellingPrice,
        taxRate: taxRatePercent / 100,
        isAvailable,
      });
      if (!result.ok) {
        setMessage(result.message ?? "Something went wrong.");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  }

  function handleRemove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeOutletProduct({ outletId: row.outletId, productId });
      if (!result.ok) {
        setMessage(result.message ?? "Something went wrong.");
        return;
      }
      setSellingPrice(0);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 border-b border-gray-50 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{row.outletName}</p>
        {!row.isSet && <p className="text-xs text-gray-400">Not configured — Rp 0 in POS</p>}
        {message && <p className="text-xs text-amber-700">{message}</p>}
      </div>
      <div>
        <label className="block text-[11px] text-gray-400">Price</label>
        <input
          type="number"
          min={0}
          value={sellingPrice}
          onChange={(e) => setSellingPrice(Number(e.target.value))}
          className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[11px] text-gray-400">Tax %</label>
        <input
          type="number"
          min={0}
          step="0.1"
          value={taxRatePercent}
          onChange={(e) => setTaxRatePercent(Number(e.target.value))}
          className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <label className="flex flex-col items-center gap-1 text-[11px] text-gray-400">
        Available
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          Save
        </button>
        {row.isSet && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function OutletPricingModal({
  productId,
  productName,
  outletPrices,
  onClose,
}: {
  productId: number;
  productName: string;
  outletPrices: OutletPriceRow[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Outlet Pricing</h2>
            <p className="text-xs text-gray-400">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Set a selling price per outlet to make this product available for sale there. An outlet
          with no price configured won&apos;t show this product in POS.
        </p>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {outletPrices.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No active outlets.</p>
          ) : (
            outletPrices.map((row) => (
              <OutletPriceRowEditor key={row.outletId} productId={productId} row={row} />
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
