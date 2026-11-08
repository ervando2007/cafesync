"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { AccountFormModal, type CoaOutlet } from "@/app/ui/master-data/account-form-modal";
import { setAccountStatus } from "@/app/master-data/actions";
import type { AccountRecord, AccountType } from "@/lib/accounting";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function accountTypeLabels(t: TranslateFn): Record<AccountType, string> {
  return {
    ASSET: t("masterData.accountTypeAsset"),
    LIABILITY: t("masterData.accountTypeLiability"),
    EQUITY: t("masterData.accountTypeEquity"),
    REVENUE: t("masterData.accountTypeRevenue"),
    EXPENSE: t("masterData.accountTypeExpense"),
  };
}

export function CoaTable({ accounts, outlet }: { accounts: AccountRecord[]; outlet: CoaOutlet }) {
  const router = useRouter();
  const { t } = useI18n();
  const ACCOUNT_TYPE_LABEL = accountTypeLabels(t);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | AccountType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [modalAccount, setModalAccount] = useState<AccountRecord | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesSearch =
        !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
      const matchesType = typeFilter === "ALL" || a.accountType === typeFilter;
      const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, search, typeFilter, statusFilter]);

  function toggleStatus(account: AccountRecord) {
    const nextStatus = account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setAccountStatus({ id: account.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t("nav.chartOfAccounts")} — {outlet.name}
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("masterData.manageCoaDesc")}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("masterData.searchAccountCodeName")}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "ALL" | AccountType)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">{t("masterData.allAccountTypes")}</option>
            {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((type) => (
              <option key={type} value={type}>
                {ACCOUNT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">{t("inventory.allStatus")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="INACTIVE">{t("common.inactive")}</option>
          </select>
          <button
            type="button"
            onClick={() => setModalAccount("new")}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("masterData.addAccount")}
          </button>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("masterData.accountCode")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.accountName")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colAccountType")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.parentAccount")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.isCashBankAccount")}</th>
              <th className="px-5 py-3 text-right font-medium">{t("masterData.colOpeningBalance")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                  {t("masterData.noAccountsMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((account) => (
                <tr
                  key={account.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    account.status === "INACTIVE" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{account.code}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {account.name}
                    {account.description && (
                      <p className="mt-0.5 text-xs font-normal text-gray-400">{account.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{ACCOUNT_TYPE_LABEL[account.accountType]}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {account.parentCode ? `${account.parentCode} — ${account.parentName}` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {account.isCashBank && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {t("common.yes")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-gray-700">
                    {(() => {
                      const b = account.openingBalances.find((x) => x.outletId === outlet.id);
                      if (!b) return "—";
                      return (
                        <>
                          {formatRp(Math.abs(b.amount))}{" "}
                          <span className="text-xs text-gray-400">
                            {b.amount > 0 ? t("masterData.debitSide") : t("masterData.creditSide")}
                          </span>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    {account.status === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {t("common.active")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        {t("common.inactive")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setModalAccount(account)}
                        className="text-gray-400 hover:text-amber-700"
                        aria-label={t("inventory.editAriaLabel", { name: account.name })}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(account)}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                      >
                        {account.status === "ACTIVE" ? t("common.deactivate") : t("common.activate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAccount && (
        <AccountFormModal
          mode={modalAccount === "new" ? "create" : "edit"}
          account={modalAccount === "new" ? undefined : modalAccount}
          accounts={accounts}
          outlet={outlet}
          onClose={() => setModalAccount(null)}
        />
      )}
    </div>
  );
}
