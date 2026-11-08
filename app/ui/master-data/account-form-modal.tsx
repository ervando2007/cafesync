"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { createAccount, updateAccount } from "@/app/master-data/actions";
import type { AccountRecord, AccountType } from "@/lib/accounting";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function accountTypeLabels(t: TranslateFn): Record<AccountType, string> {
  return {
    ASSET: t("masterData.accountTypeAsset"),
    LIABILITY: t("masterData.accountTypeLiability"),
    EQUITY: t("masterData.accountTypeEquity"),
    REVENUE: t("masterData.accountTypeRevenue"),
    EXPENSE: t("masterData.accountTypeExpense"),
  };
}

export interface CoaOutlet {
  id: number;
  code: string;
  name: string;
}

type OpeningRow = { debit: string; credit: string };

/** Mirrors lib/opening-balances.ts so the form can explain up front why an account takes no opening balance. */
function ineligibleReason(
  accountType: AccountType,
  code: string,
  hasChildren: boolean,
): "PROFIT_LOSS" | "HAS_CHILDREN" | "INVENTORY" | null {
  if (accountType === "REVENUE" || accountType === "EXPENSE") return "PROFIT_LOSS";
  if (hasChildren) return "HAS_CHILDREN";
  const c = code.trim();
  if (c === "1200" || c.startsWith("1200.")) return "INVENTORY";
  return null;
}

const REASON_KEY = {
  PROFIT_LOSS: "masterData.errOpeningNotForProfitLoss",
  HAS_CHILDREN: "masterData.errOpeningNotForParent",
  INVENTORY: "masterData.errOpeningNotForInventory",
} as const;

function toAmount(value: string): number {
  const n = Number(value);
  return value.trim() === "" || !Number.isFinite(n) ? 0 : n;
}

export function AccountFormModal({
  mode,
  account,
  accounts,
  outlet,
  onClose,
}: {
  mode: "create" | "edit";
  account?: AccountRecord;
  accounts: AccountRecord[];
  /** The outlet selected on the COA page — the only outlet whose opening balance this form edits. */
  outlet: CoaOutlet;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const ACCOUNT_TYPE_LABEL = accountTypeLabels(t);
  const [code, setCode] = useState(account?.code ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [description, setDescription] = useState(account?.description ?? "");
  const [accountType, setAccountType] = useState<AccountType>(account?.accountType ?? "ASSET");
  const [parentId, setParentId] = useState<string>(account?.parentId ? String(account.parentId) : "");
  const [isCashBank, setIsCashBank] = useState(account?.isCashBank ?? false);
  const [opening, setOpening] = useState<OpeningRow>(() => {
    const b = account?.openingBalances.find((x) => x.outletId === outlet.id);
    if (!b) return { debit: "", credit: "" };
    return b.amount > 0 ? { debit: String(b.amount), credit: "" } : { debit: "", credit: String(-b.amount) };
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentOptions = accounts.filter((a) => a.id !== account?.id);
  const normalBalanceSide =
    accountType === "ASSET" || accountType === "EXPENSE"
      ? t("masterData.debitSide")
      : t("masterData.creditSide");
  const hasChildren = account ? account.openingIneligible === "HAS_CHILDREN" || accounts.some((a) => a.parentId === account.id) : false;
  const reason = ineligibleReason(accountType, code, hasChildren);
  const invalidRow =
    toAmount(opening.debit) < 0 || toAmount(opening.credit) < 0 || (toAmount(opening.debit) > 0 && toAmount(opening.credit) > 0);

  function setRow(side: keyof OpeningRow, value: string) {
    // Debit and Credit are exclusive: typing one clears the other.
    setOpening((prev) =>
      side === "debit" ? { debit: value, credit: value ? "" : prev.credit } : { credit: value, debit: value ? "" : prev.debit },
    );
  }

  function handleSubmit() {
    setError(null);
    if (invalidRow) {
      setError(t("masterData.openingDebitOrCredit"));
      return;
    }
    const input = {
      code,
      name,
      description,
      accountType,
      parentId: parentId ? Number(parentId) : null,
      isCashBank,
      // Dr-signed, for the selected outlet only; an ineligible account sends 0.
      opening: {
        outletId: outlet.id,
        amount: reason ? 0 : toAmount(opening.debit) - toAmount(opening.credit),
      },
    };

    startTransition(async () => {
      const result =
        mode === "create" ? await createAccount(input) : await updateAccount({ ...input, id: account!.id });

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
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? t("masterData.addAccount") : t("masterData.editAccountTitle")}
          </h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">{t("masterData.accountCode")}</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("masterData.accountCodePlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("masterData.colAccountType")}</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((type) => (
                  <option key={type} value={type}>
                    {ACCOUNT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.accountName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("masterData.accountNamePlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.accountDescription")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("masterData.accountDescriptionPlaceholder")}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.parentAccount")}</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">{t("masterData.noParentAccount")}</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isCashBank}
              onChange={(e) => setIsCashBank(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
            />
            {t("masterData.isCashBankAccount")}
          </label>

          <div className="rounded-xl border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-700">
              {t("masterData.openingForOutlet", { outlet: `${outlet.name} (${outlet.code})` })}
            </p>
            {reason ? (
              <p className="mt-1 text-xs text-gray-500">{t(REASON_KEY[reason])}</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-gray-400">{t("masterData.openingBalanceHint", { side: normalBalanceSide })}</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["debit", "credit"] as const).map((side) => (
                    <div key={side}>
                      <label className="text-xs text-gray-500">
                        {side === "debit" ? t("masterData.debitSide") : t("masterData.creditSide")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={opening[side]}
                        onChange={(e) => setRow(side, e.target.value)}
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
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
            {isPending ? t("common.saving") : t("masterData.saveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
