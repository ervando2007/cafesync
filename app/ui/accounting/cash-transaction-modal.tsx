"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { createCashTransaction } from "@/app/accounting/actions";
import type { AccountOption } from "@/lib/accounting";
import { useI18n } from "@/app/i18n-provider";

export function CashTransactionModal({
  outletId,
  accounts,
  onClose,
}: {
  outletId: number;
  accounts: AccountOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const cashAccounts = accounts.filter((a) => a.isCashBank);
  const counterpartAccounts = accounts.filter((a) => !a.isCashBank);

  const [txnType, setTxnType] = useState<"IN" | "OUT">("OUT");
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id ?? 0);
  const [counterpartAccountId, setCounterpartAccountId] = useState(
    counterpartAccounts[0]?.id ?? 0,
  );
  const [amount, setAmount] = useState(0);
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (amount <= 0) {
      setError(t("accounting.errAmountPositive"));
      return;
    }

    startTransition(async () => {
      const result = await createCashTransaction({
        outletId,
        cashAccountId,
        counterpartAccountId,
        txnType,
        amount,
        txnDate,
        description,
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("accounting.newCashTransaction")}</h2>
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

        <div className="mt-4 space-y-4">
          <div className="flex rounded-lg border border-gray-200 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTxnType("IN")}
              className={`flex-1 rounded-md py-2 font-medium ${
                txnType === "IN" ? "bg-emerald-600 text-white" : "text-gray-500"
              }`}
            >
              {t("dashboard.cashIn")}
            </button>
            <button
              type="button"
              onClick={() => setTxnType("OUT")}
              className={`flex-1 rounded-md py-2 font-medium ${
                txnType === "OUT" ? "bg-red-600 text-white" : "text-gray-500"
              }`}
            >
              {t("dashboard.cashOut")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">{t("accounting.cashBankAccount")}</label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("accounting.colDate")}</label>
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">
              {txnType === "IN" ? t("accounting.sourceCredit") : t("accounting.categoryDebit")}
            </label>
            <select
              value={counterpartAccountId}
              onChange={(e) => setCounterpartAccountId(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            >
              {counterpartAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("accounting.amount")}</label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("accounting.description")}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("accounting.descriptionPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
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
            disabled={isPending}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : t("accounting.saveTransaction")}
          </button>
        </div>
      </div>
    </div>
  );
}
