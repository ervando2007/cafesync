"use client";

import { Fragment, useEffect, useState } from "react";
import { DownloadIcon, PlusIcon, PrinterIcon } from "@/app/ui/pos/icons";
import { JournalEntryModal } from "@/app/ui/accounting/journal-entry-modal";
import { JournalEntryVoucherPrint } from "@/app/ui/accounting/journal-entry-voucher-print";
import type { AccountOption, JournalEntryRow } from "@/lib/accounting";
import type { StockItemOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function JournalEntriesTable({
  outletId,
  outletName,
  entries,
  accounts,
  stockItems,
  canPost,
}: {
  outletId: number;
  outletName: string;
  entries: JournalEntryRow[];
  accounts: AccountOption[];
  stockItems: StockItemOption[];
  canPost: boolean;
}) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [printOnlyId, setPrintOnlyId] = useState<number | null>(null);

  useEffect(() => {
    if (printOnlyId === null) return;

    function handleAfterPrint() {
      setPrintOnlyId(null);
    }

    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printOnlyId]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-center justify-between border-b border-gray-100 p-5 print:hidden">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("nav.journalEntries")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("accounting.everyPostedTxnDesc")}</p>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("accounting.newEntry")}
          </button>
        )}
      </div>

      <div className="overflow-x-auto print:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("accounting.colJournalNo")}</th>
              <th className="px-5 py-3 font-medium">{t("accounting.colDate")}</th>
              <th className="px-5 py-3 font-medium">{t("accounting.colSource")}</th>
              <th className="px-5 py-3 font-medium">{t("accounting.colMemo")}</th>
              <th className="px-5 py-3 font-medium">{t("accounting.colAmount")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                  {t("accounting.noJournalEntriesInPeriod")}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr className="border-b border-gray-50 last:border-0 hover:bg-amber-50/40">
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3 font-medium text-gray-900"
                    >
                      {entry.journalNo}
                    </td>
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3 text-gray-500"
                    >
                      {entry.entryDate}
                    </td>
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3 text-gray-500"
                    >
                      {entry.sourceType ?? "MANUAL"}
                    </td>
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3 text-gray-700"
                    >
                      {entry.memo ?? "—"}
                    </td>
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3 font-medium text-gray-900"
                    >
                      {formatRp(entry.totalDebit)}
                    </td>
                    <td
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="cursor-pointer px-5 py-3"
                    >
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          entry.status === "POSTED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {entry.status === "POSTED" ? t("accounting.statusPosted") : t("accounting.statusReversed")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/accounting/journal/${entry.id}/export`}
                          title={t("reports.download")}
                          className="text-gray-400 hover:text-amber-700"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setPrintOnlyId(entry.id)}
                          title={t("accounting.print")}
                          className="text-gray-400 hover:text-amber-700"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={7} className="px-5 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="pb-1.5 font-medium">{t("accounting.colAccount")}</th>
                              <th className="pb-1.5 font-medium">{t("accounting.colQty")}</th>
                              <th className="pb-1.5 font-medium">{t("accounting.colDescription")}</th>
                              <th className="pb-1.5 font-medium">{t("accounting.colDebit")}</th>
                              <th className="pb-1.5 font-medium">{t("accounting.colCredit")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line, i) => (
                              <tr key={i}>
                                <td className="py-1 text-gray-700">
                                  {line.accountCode} — {line.accountName}
                                </td>
                                <td className="py-1 text-gray-500">
                                  {line.qty != null
                                    ? `${line.stockItemName ?? ""} (${line.qty} ${line.unitName ?? ""})`
                                    : "—"}
                                </td>
                                <td className="py-1 text-gray-500">{line.memo ?? "—"}</td>
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

      {entries.map((entry) => (
        <JournalEntryVoucherPrint
          key={entry.id}
          entry={entry}
          outletName={outletName}
          visible={printOnlyId === entry.id}
        />
      ))}

      {showModal && (
        <JournalEntryModal
          outletId={outletId}
          accounts={accounts}
          stockItems={stockItems}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
