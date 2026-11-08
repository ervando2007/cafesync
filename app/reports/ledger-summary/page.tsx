import { requireRole } from "@/lib/auth-guard";
import { buildLedgerSummary, getAccountMovements, resolveLedgerScope } from "@/lib/ledger";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ReportDownload, ShowZeroToggle } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

function amount(value: number) {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Accurate-style "(Dr) 1.234,00" / "(Cr) -1.234,00". */
function drCr(value: number) {
  const v = Math.round(value * 100) / 100;
  return v < 0 ? `(Cr) ${amount(v)}` : `(Dr) ${amount(v)}`;
}

export default async function LedgerSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; zero?: string }>;
}) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());
  const showZero = params.zero === "1";

  const rows = buildLedgerSummary(await getAccountMovements(scope, from, to), showZero);

  const query = `outlet=${scope.selectedOutletId}&from=${from}&to=${to}${showZero ? "&zero=1" : ""}`;
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.ledgerSummary")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <ShowZeroToggle checked={showZero} />
        <ReportDownload
          exportUrl={`/reports/ledger-summary/export?${query}`}
          filename={`ringkasan-buku-besar-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("reports.openingBalanceScopeHint")}</p>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 text-center">
            <h2 className="text-base font-bold text-gray-900">{COMPANY_NAME}</h2>
            <p className="text-sm font-medium text-gray-700">{t("reports.ledgerSummaryTitle")}</p>
            <p className="text-xs text-gray-400">
              {scope.label} · {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">{t("reports.colAccountNo")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colAccountName")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colBeginningBalance")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colChangeDebit")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colChangeCredit")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colNetChange")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colEndingBalance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("reports.noLedgerEntries")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const parent = r.level === 0;
                    return (
                      <tr key={i} className={`border-b border-gray-50 ${parent ? "bg-gray-50/60 font-semibold" : ""}`}>
                        <td className={`whitespace-nowrap py-2 pr-4 font-mono text-xs ${parent ? "pl-4 text-gray-900" : "pl-8 text-gray-600"}`}>
                          {r.code}
                        </td>
                        <td className={`py-2 pr-4 ${parent ? "pl-4 text-gray-900" : "pl-8 text-gray-700"}`}>{r.name}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{drCr(r.beginning)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{amount(r.debit)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{amount(r.credit)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{drCr(r.netChange)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{drCr(r.ending)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
