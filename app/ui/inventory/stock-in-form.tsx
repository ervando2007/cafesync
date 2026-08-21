"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { SupplierManagerModal } from "@/app/ui/inventory/supplier-manager-modal";
import { stockIn } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption, SupplierRecord } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";
import { PageHeader } from "@/app/ui/page-header";

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
  const { t } = useI18n();
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
      setMessage({ type: "error", text: t("inventory.addAtLeastOneItemPeriod") });
      return;
    }
    if (lines.some((l) => l.qty <= 0)) {
      setMessage({ type: "error", text: t("inventory.qtyMustBeGreaterThanZero") });
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
        setMessage({ type: "error", text: result.message ?? t("common.somethingWentWrong") });
        return;
      }
      setLines([]);
      setNotes("");
      setSupplierId("");
      setMessage({ type: "info", text: t("inventory.stockInSaved") });
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader eyebrow={t("nav.inventory")} title={t("nav.stockIn")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
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
            <label className="text-xs text-gray-500">{t("inventory.purchaseFromSupplier")}</label>
            <button
              type="button"
              onClick={() => setShowSupplierManager(true)}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              {t("common.manage")}
            </button>
          </div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">{t("inventory.noSupplierOther")}</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("inventory.notesRemarks")}</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("inventory.notesPlaceholderStockIn")}
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
          <p className="text-xs text-gray-500">{t("inventory.totalValue")}</p>
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
          {isPending ? t("common.saving") : t("inventory.saveStockIn")}
        </button>
      </div>

      {showSupplierManager && (
        <SupplierManagerModal
          suppliers={suppliers}
          onClose={() => setShowSupplierManager(false)}
        />
      )}
      </div>
    </>
  );
}
