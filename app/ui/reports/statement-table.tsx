import type { StatementRow } from "@/lib/ledger";

function formatAmount(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "-";
  const text = Math.abs(rounded).toLocaleString("id-ID");
  return rounded < 0 ? `(${text})` : text;
}

/** Two-column financial statement (KETERANGAN | JUMLAH) for Laba Rugi / Neraca. */
export function StatementTable({
  rows,
  descriptionHeader,
  amountHeader,
}: {
  rows: StatementRow[];
  descriptionHeader: string;
  amountHeader: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <th className="px-5 py-3">{descriptionHeader}</th>
          <th className="w-48 px-5 py-3 text-right">{amountHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          if (row.kind === "section") {
            return (
              <tr key={i}>
                <td colSpan={2} className="px-5 pb-1 pt-5 text-sm font-bold text-gray-900">
                  {row.label}
                </td>
              </tr>
            );
          }
          if (row.kind === "group") {
            return (
              <tr key={i}>
                <td colSpan={2} className="px-5 pb-1 pt-3 text-xs font-semibold uppercase text-amber-800">
                  {row.label}
                </td>
              </tr>
            );
          }
          if (row.kind === "line") {
            return (
              <tr key={i} className="hover:bg-gray-50/60">
                <td className="py-1.5 pl-9 pr-5 text-gray-700">
                  {row.code && <span className="mr-2 font-mono text-xs text-gray-400">{row.code}</span>}
                  {row.label}
                </td>
                <td className="px-5 py-1.5 text-right tabular-nums text-gray-700">{formatAmount(row.amount)}</td>
              </tr>
            );
          }
          const isTotal = row.kind === "total";
          return (
            <tr key={i} className={isTotal ? "bg-amber-50/60" : ""}>
              <td className={`px-5 py-2 font-semibold text-gray-900 ${isTotal ? "uppercase" : ""}`}>{row.label}</td>
              <td
                className={`px-5 py-2 text-right font-semibold tabular-nums ${
                  isTotal ? "border-y border-gray-300" : "border-t border-gray-200"
                } ${row.amount < 0 ? "text-red-600" : "text-gray-900"}`}
              >
                {formatAmount(row.amount)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
