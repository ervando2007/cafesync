"use client";

import type { JournalEntryRow } from "@/lib/accounting";
import { useI18n } from "@/app/i18n-provider";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function JournalEntryVoucherPrint({
  entry,
  outletName,
  visible,
}: {
  entry: JournalEntryRow;
  outletName: string;
  visible: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={visible ? "hidden print:block" : "hidden"}>
      <h1 className="text-center text-xl font-bold uppercase tracking-wide">
        {t("accounting.generalJournal")}
      </h1>

      <div className="mt-6 flex justify-between text-sm">
        <div className="space-y-1">
          <div className="flex gap-2">
            <span className="w-32 font-medium text-gray-700">{t("accounting.colDate")}</span>
            <span>: {entry.entryDate}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 font-medium text-gray-700">{t("accounting.pic")}</span>
            <span>: {entry.pic ?? "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 font-medium text-gray-700">{t("nav.outlets")}</span>
            <span>: {outletName}</span>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex justify-end gap-2">
            <span className="font-medium text-gray-700">{t("accounting.voucherNo")}</span>
            <span>: {entry.voucherNo ?? "—"}</span>
          </div>
          <div className="flex justify-end gap-2">
            <span className="font-medium text-gray-700">{t("accounting.colJournalNo")}</span>
            <span>: {entry.journalNo}</span>
          </div>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse border border-gray-900 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-900 bg-yellow-200 px-2 py-1">{t("accounting.colNo")}</th>
            <th className="border border-gray-900 bg-yellow-200 px-2 py-1">{t("accounting.colAccount")}</th>
            <th className="border border-gray-900 bg-yellow-200 px-2 py-1">{t("accounting.colQty")}</th>
            <th className="border border-gray-900 px-2 py-1">{t("accounting.colDescription")}</th>
            <th className="border border-gray-900 bg-yellow-200 px-2 py-1">{t("accounting.colDebit")}</th>
            <th className="border border-gray-900 bg-yellow-200 px-2 py-1">{t("accounting.colCredit")}</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((line, i) => (
            <tr key={i}>
              <td className="border border-gray-900 px-2 py-1.5 text-center">{i + 1}</td>
              <td className="border border-gray-900 px-2 py-1.5">
                {line.accountCode} — {line.accountName}
              </td>
              <td className="border border-gray-900 px-2 py-1.5 text-right">
                {line.qty != null ? `${line.qty} ${line.unitName ?? ""}` : ""}
              </td>
              <td className="border border-gray-900 px-2 py-1.5">{line.memo ?? ""}</td>
              <td className="border border-gray-900 px-2 py-1.5 text-right">
                {line.debit > 0 ? formatRp(line.debit) : ""}
              </td>
              <td className="border border-gray-900 px-2 py-1.5 text-right">
                {line.credit > 0 ? formatRp(line.credit) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-16 grid grid-cols-3 gap-6 text-center text-sm">
        <div>
          <p className="font-medium text-gray-700">{t("accounting.madeBy")}</p>
          <p className="mt-16 border-t border-gray-400 pt-1">{entry.createdByName ?? "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-700">{t("accounting.approvedBy")}</p>
          <p className="mt-16 border-t border-gray-400 pt-1">{entry.approvedBy ?? "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-700">{t("accounting.acknowledgedBy")}</p>
          <p className="mt-16 border-t border-gray-400 pt-1">{entry.acknowledgedBy ?? "—"}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
