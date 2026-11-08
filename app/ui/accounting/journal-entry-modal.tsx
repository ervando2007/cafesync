"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, XIcon } from "@/app/ui/pos/icons";
import { createJournalEntry } from "@/app/accounting/actions";
import type { AccountOption } from "@/lib/accounting";
import type { StockItemOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

interface DraftLine {
  accountId: number;
  stockItemId: number | null;
  qty: string;
  memo: string;
  debit: string;
  credit: string;
}

function blankLine(accountId: number): DraftLine {
  return { accountId, stockItemId: null, qty: "", memo: "", debit: "", credit: "" };
}

/** Must match isInventoryAccountCode in lib/opening-balances.ts. */
function isInventoryAccountCode(code: string): boolean {
  return code === "1200" || code.startsWith("1200.");
}

export function JournalEntryModal({
  outletId,
  accounts,
  stockItems,
  onClose,
}: {
  outletId: number;
  accounts: AccountOption[];
  stockItems: StockItemOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [pic, setPic] = useState("");
  const [memo, setMemo] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [acknowledgedBy, setAcknowledgedBy] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    blankLine(accounts[0]?.id ?? 0),
    blankLine(accounts[0]?.id ?? 0),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inventoryAccountIds = useMemo(
    () => new Set(accounts.filter((a) => isInventoryAccountCode(a.code)).map((a) => a.id)),
    [accounts],
  );
  const stockItemById = useMemo(
    () => new Map(stockItems.map((s) => [s.stockItemId, s])),
    [stockItems],
  );

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = useMemo(
    () => lines.length >= 2 && Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0,
    [lines.length, totalDebit, totalCredit],
  );

  function addLine() {
    setLines((prev) => [...prev, blankLine(accounts[0]?.id ?? 0)]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleSubmit() {
    setError(null);
    if (!isBalanced) {
      setError(t("accounting.errDebitCreditMismatch"));
      return;
    }
    const incompleteInventoryLine = lines.some(
      (l) => inventoryAccountIds.has(l.accountId) && (l.stockItemId == null || !(Number(l.qty) > 0)),
    );
    if (incompleteInventoryLine) {
      setError(t("accounting.errInventoryLineNeedsItem"));
      return;
    }

    startTransition(async () => {
      const result = await createJournalEntry({
        outletId,
        entryDate,
        pic: pic.trim() || undefined,
        memo,
        approvedBy: approvedBy.trim() || undefined,
        acknowledgedBy: acknowledgedBy.trim() || undefined,
        lines: lines.map((l) => {
          const isInventory = inventoryAccountIds.has(l.accountId);
          return {
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            memo: l.memo.trim() || undefined,
            stockItemId: isInventory ? (l.stockItemId ?? undefined) : undefined,
            qty: isInventory && Number(l.qty) > 0 ? Number(l.qty) : undefined,
          };
        }),
      });
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("accounting.newJournalEntry")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("common.close")}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">{t("accounting.colDate")}</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t("accounting.pic")}</label>
            <input
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t("accounting.voucherNo")}</label>
            <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
              {t("accounting.voucherNoAutoHint")}
            </p>
          </div>
          <div className="col-span-3">
            <label className="text-xs text-gray-500">{t("accounting.memo")}</label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("accounting.memoPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t("accounting.approvedBy")}</label>
            <input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t("accounting.acknowledgedBy")}</label>
            <input
              value={acknowledgedBy}
              onChange={(e) => setAcknowledgedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{t("accounting.lines")}</h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t("accounting.addLine")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-2 font-medium">{t("accounting.colAccount")}</th>
                  <th className="pb-2 pr-2 font-medium">{t("accounting.colQty")}</th>
                  <th className="pb-2 pr-2 font-medium">{t("accounting.colDescription")}</th>
                  <th className="pb-2 pr-2 font-medium">{t("accounting.colDebit")}</th>
                  <th className="pb-2 pr-2 font-medium">{t("accounting.colCredit")}</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const isInventoryLine = inventoryAccountIds.has(line.accountId);
                  const selectedStockItem =
                    line.stockItemId != null ? stockItemById.get(line.stockItemId) : undefined;
                  return (
                  <tr key={i} className="border-b border-gray-50 align-top">
                    <td className="py-2 pr-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => {
                          const accountId = Number(e.target.value);
                          const stillInventory = inventoryAccountIds.has(accountId);
                          updateLine(i, {
                            accountId,
                            stockItemId: stillInventory ? line.stockItemId : null,
                            qty: stillInventory ? line.qty : "",
                          });
                        }}
                        className="w-full min-w-[10rem] rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      {isInventoryLine ? (
                        <div className="flex min-w-[15rem] items-start gap-1.5">
                          <select
                            value={line.stockItemId ?? ""}
                            onChange={(e) =>
                              updateLine(i, {
                                stockItemId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="w-full min-w-[9rem] rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                          >
                            <option value="">{t("accounting.selectStockItem")}</option>
                            {stockItems.map((s) => (
                              <option key={s.stockItemId} value={s.stockItemId}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <div>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.qty}
                              onChange={(e) => updateLine(i, { qty: e.target.value })}
                              placeholder="0"
                              className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
                            />
                            <p className="mt-1 text-[11px] text-gray-400">
                              {selectedStockItem?.unitName ?? ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="w-28 pt-1.5 text-[11px] text-gray-300">
                          {t("accounting.qtyNoStockItemHint")}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={line.memo}
                        onChange={(e) => updateLine(i, { memo: e.target.value })}
                        placeholder={t("accounting.colDescription")}
                        className="w-full min-w-[9rem] rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={line.debit}
                        onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                        placeholder="0"
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={line.credit}
                        onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                        placeholder="0"
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        className="text-gray-300 hover:text-red-600 disabled:opacity-30"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-end gap-6 border-t border-gray-100 pt-3 text-sm">
            <span>
              <span className="text-gray-400">{t("accounting.totalDebitLabel")}</span>
              <span className="font-medium text-gray-900">{formatRp(totalDebit)}</span>
            </span>
            <span>
              <span className="text-gray-400">{t("accounting.totalCreditLabel")}</span>
              <span className="font-medium text-gray-900">{formatRp(totalCredit)}</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}
            >
              {isBalanced ? t("accounting.balanced") : t("accounting.notBalanced")}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !isBalanced}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : t("accounting.postEntry")}
          </button>
        </div>
      </div>
    </div>
  );
}
