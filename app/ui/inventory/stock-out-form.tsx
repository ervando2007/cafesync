"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { LineItemEditor, type EditorLine } from "@/app/ui/inventory/line-item-editor";
import { stockOut } from "@/app/inventory/actions";
import type { OutletOption } from "@/lib/pos";
import type { StockItemOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";
import { PageHeader } from "@/app/ui/page-header";

const REASONS = ["Waste / Spoilage", "Internal Use", "Damaged", "Other"] as const;

function reasonLabel(reason: (typeof REASONS)[number], t: TranslateFn): string {
  const map: Record<(typeof REASONS)[number], string> = {
    "Waste / Spoilage": t("inventory.reasonWaste"),
    "Internal Use": t("inventory.reasonInternalUse"),
    Damaged: t("inventory.reasonDamaged"),
    Other: t("inventory.reasonOther"),
  };
  return map[reason];
}

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
  const { t } = useI18n();
  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableItems = outletItems[selectedOutletId] ?? [];

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
      const result = await stockOut({
        outletId: selectedOutletId,
        reason: `${reason}${notes ? ` - ${notes}` : ""}`,
        notes,
        items: lines.map((l) => ({ stockItemId: l.stockItemId, qty: l.qty })),
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? t("common.somethingWentWrong") });
        return;
      }
      setLines([]);
      setNotes("");
      setMessage({ type: "info", text: t("inventory.stockOutSaved") });
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader eyebrow={t("nav.inventory")} title={t("inventory.stockOutTitle")}>
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
          <label className="text-xs text-gray-500">{t("inventory.reason")}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {reasonLabel(r, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("inventory.notesRemarks")}</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("inventory.notesPlaceholderStockOut")}
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
          {isPending ? t("common.saving") : t("inventory.saveStockOut")}
        </button>
      </div>
      </div>
    </>
  );
}
