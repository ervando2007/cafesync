"use client";

import { Fragment, useState } from "react";
import { PlusIcon } from "@/app/ui/pos/icons";
import { JournalEntryModal } from "@/app/ui/accounting/journal-entry-modal";
import type { AccountOption, JournalEntryRow } from "@/lib/accounting";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function JournalEntriesTable({
  outletId,
  entries,
  accounts,
  canPost,
}: {
  outletId: number;
  entries: JournalEntryRow[];
  accounts: AccountOption[];
  canPost: boolean;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Journal Entries</h2>
          <p className="mt-0.5 text-xs text-gray-400">Every posted double-entry transaction.</p>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New Entry
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">Journal No.</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Memo</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  No journal entries in this period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-amber-50/40"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{entry.journalNo}</td>
                    <td className="px-5 py-3 text-gray-500">{entry.entryDate}</td>
                    <td className="px-5 py-3 text-gray-500">{entry.sourceType ?? "MANUAL"}</td>
                    <td className="px-5 py-3 text-gray-700">{entry.memo ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatRp(entry.totalDebit)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          entry.status === "POSTED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={6} className="px-5 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="pb-1.5 font-medium">Account</th>
                              <th className="pb-1.5 font-medium">Debit</th>
                              <th className="pb-1.5 font-medium">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line, i) => (
                              <tr key={i}>
                                <td className="py-1 text-gray-700">
                                  {line.accountCode} — {line.accountName}
                                </td>
                                <td className="py-1 text-gray-700">
                                  {line.debit > 0 ? formatRp(line.debit) : "—"}
                                </td>
                                <td className="py-1 text-gray-700">
                                  {line.credit > 0 ? formatRp(line.credit) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <JournalEntryModal outletId={outletId} accounts={accounts} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
