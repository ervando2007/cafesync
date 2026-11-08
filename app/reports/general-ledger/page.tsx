import { requireRole } from "@/lib/auth-guard";
import { getAccounts } from "@/lib/accounting";
import { getLedgerHistory, resolveLedgerScope } from "@/lib/ledger";
import {
  COMPANY_NAME,
  firstDayOfMonth,
  formatReportDate,
  isoDateOr,
  sourceTypeLabel,
  today,
} from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { AccountSelect, ReportDownload } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

function formatAmount(value: number) {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; account?: string }>;
}) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());

  const accounts = await getAccounts();
  const accountId = accounts.some((a) => a.id === Number(params.account)) ? Number(params.account) : null;
  const rows = await getLedgerHistory(scope, from, to, accountId);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const query = `outlet=${scope.selectedOutletId}&from=${from}&to=${to}${accountId ? `&account=${accountId}` : ""}`;
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.generalLedger")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <AccountSelect accounts={accounts} value={accountId} />
        <ReportDownload
          exportUrl={`/reports/general-ledger/export?${query}`}
          filename={`buku-besar-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 text-center">
            <h2 className="text-base font-bold text-gray-900">{COMPANY_NAME}</h2>
            <p className="text-sm font-medium text-gray-700">{t("reports.generalLedgerTitle")}</p>
            <p className="text-xs text-gray-400">
              {scope.label} · {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">{t("reports.colDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colSourceType")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colSourceNo")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colAccountNo")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colAccountName")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colDescription")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colDebitAmount")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colCreditAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("reports.noLedgerEntries")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{formatReportDate(r.date, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-500">{sourceTypeLabel(t, r.sourceType)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-500">{r.sourceNo}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-700">{r.accountCode}</td>
                      <td className="px-4 py-2 text-gray-900">{r.accountName}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{r.description}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-gray-700">{formatAmount(r.debit)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-gray-700">{formatAmount(r.credit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50/60">
                    <td colSpan={6} className="px-4 py-3 font-semibold text-gray-900">{t("reports.totalRow")}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatAmount(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatAmount(totalCredit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
