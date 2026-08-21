"use client";

import { useState } from "react";
import { PlusIcon } from "@/app/ui/pos/icons";
import { CashTransactionModal } from "@/app/ui/accounting/cash-transaction-modal";
import type { AccountOption, CashTransactionRow } from "@/lib/accounting";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function CashTransactionsTable({
  outletId,
  transactions,
  accounts,
  canPost,
}: {
  outletId: number;
  transactions: CashTransactionRow[];
  accounts: AccountOption[];
  canPost: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cash Transactions</h2>
          <p className="mt-0.5 text-xs text-gray-400">Quick cash/bank in and out entries.</p>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New Transaction
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  No cash transactions in this period.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-500">{txn.txnDate}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{txn.accountName}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        txn.txnType === "IN"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {txn.txnType === "IN" ? "Cash In" : "Cash Out"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{txn.description ?? "—"}</td>
                  <td
                    className={`px-5 py-3 font-medium ${
                      txn.txnType === "IN" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {txn.txnType === "IN" ? "+" : "-"}
                    {formatRp(txn.amount)}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{txn.createdByName ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CashTransactionModal outletId={outletId} accounts={accounts} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
