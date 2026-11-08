import type { Session } from "next-auth";
import { resolveLedgerScope } from "@/lib/ledger";
import { getBankStatement, getStatementAccounts } from "@/lib/bank-statement";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ParamSelect, ReportDownload } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";

export interface AccountStatementConfig {
  accountCodes: string[];
  navTitleKey: TranslationKey;
  titleKey: TranslationKey;
  allAccountsKey: TranslationKey;
  exportPath: string;
  filePrefix: string;
}

export type AccountStatementParams = { outlet?: string; from?: string; to?: string; account?: string };

function amount(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "2026-10-20" + "23:59:59" → "20/10/26 23:59:59", as printed on a bank statement. */
function statementStamp(date: string, time: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y.slice(2)} ${time}`;
}

/** Bank / Kas statement page: opening balance, one row per transaction, running balance. */
export async function AccountStatement({
  session,
  params,
  config,
}: {
  session: Session;
  params: AccountStatementParams;
  config: AccountStatementConfig;
}) {
  const { t, locale } = await getT();
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());

  const accounts = await getStatementAccounts(config.accountCodes);
  const selected = accounts.length === 1 ? accounts[0] : (accounts.find((a) => a.id === Number(params.account)) ?? null);
  const statement = await getBankStatement(scope, selected ? [selected.id] : accounts.map((a) => a.id), from, to);
  const accountLabel = selected ? `${selected.code} — ${selected.name}` : t(config.allAccountsKey);

  const query = `outlet=${scope.selectedOutletId}&from=${from}&to=${to}${selected && accounts.length > 1 ? `&account=${selected.id}` : ""}`;
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t(config.navTitleKey)}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        {accounts.length > 1 && (
          <ParamSelect
            param="account"
            value={selected ? String(selected.id) : ""}
            options={[
              { value: "", label: t(config.allAccountsKey) },
              ...accounts.map((a) => ({ value: String(a.id), label: `${a.code} — ${a.name}` })),
            ]}
          />
        )}
        <ReportDownload
          exportUrl={`${config.exportPath}?${query}`}
          filename={`${config.filePrefix}-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-1 text-xs text-gray-400">{t("reports.bankStatementHint")}</p>
        <p className="mb-3 text-xs text-gray-400">{t("reports.openingBalanceScopeHint")}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t("reports.bankOpeningRow"), value: statement.opening },
            { label: t("reports.colBankDebit"), value: statement.totalDebit },
            { label: t("reports.colBankCredit"), value: statement.totalCredit },
            { label: t("reports.colClosingBalance"), value: statement.closing },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-gray-500">{s.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{amount(s.value)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t(config.titleKey)}</h2>
            <p className="text-xs text-gray-500">
              {COMPANY_NAME} · {scope.label} · {accountLabel} ·{" "}
              {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-sky-50/70 text-left text-xs text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">{t("reports.colTransactionDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colTransactionDescription")}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">{t("reports.colTellerUserId")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colBankDebit")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colBankCredit")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("reports.colBalance")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-gray-700">{statementStamp(from, "00:00:00")}</td>
                  <td className="px-4 py-2 font-medium text-gray-700">{t("reports.bankOpeningRow")}</td>
                  <td />
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{amount(0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{amount(0)}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-gray-900">{amount(statement.opening)}</td>
                </tr>
                {statement.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("reports.noLedgerEntries")}
                    </td>
                  </tr>
                ) : (
                  statement.rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-4 py-2 align-top tabular-nums text-gray-700">
                        {statementStamp(r.date, r.time)}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <p className="text-gray-900">{r.description || r.sourceNo}</p>
                        <p className="font-mono text-[11px] text-gray-400">
                          {r.sourceNo}
                          {selected ? "" : ` · ${r.accountCode} ${r.accountName}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-gray-500">{r.userId}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-top tabular-nums text-gray-700">{amount(r.debit)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-top tabular-nums text-gray-700">{amount(r.credit)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-top font-medium tabular-nums text-gray-900">
                        {amount(r.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 bg-gray-50/60">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-gray-900">{t("reports.totalRow")}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{amount(statement.totalDebit)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{amount(statement.totalCredit)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{amount(statement.closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
