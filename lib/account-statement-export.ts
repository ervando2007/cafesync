import "server-only";
import { resolveLedgerScope } from "@/lib/ledger";
import { getBankStatement, getStatementAccounts } from "@/lib/bank-statement";
import { COMPANY_NAME, firstDayOfMonth, isoDateOr, today } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, RP2_FORMAT, writeHeader, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-04-11" → "11-04-2026", as in the other report headers. */
const dmy = (iso: string) => iso.split("-").reverse().join("-");
/** UTC so the cell shows the recorded wall-clock date/time regardless of server timezone. */
function stamp(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

/** xlsx download for the Bank / Kas statement reports (same header block as the Sales report). */
export async function accountStatementExport(
  request: Request,
  config: { accountCodes: string[]; titleKey: TranslationKey; allAccountsKey: TranslationKey; filePrefix: string },
): Promise<Response> {
  const session = await authorizeExport(ACCOUNTING_REPORT_ROLES);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const accounts = await getStatementAccounts(config.accountCodes);
  const selected =
    accounts.length === 1 ? accounts[0] : (accounts.find((a) => a.id === Number(url.searchParams.get("account"))) ?? null);
  const statement = await getBankStatement(scope, selected ? [selected.id] : accounts.map((a) => a.id), from, to);

  const now = new Date();
  const fileStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const generated = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const title = t(config.titleKey);

  const { workbook, sheet } = newWorkbook("Report");
  sheet.columns = [{ width: 19 }, { width: 50 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 20 }];

  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 13 };
  sheet.getCell("A2").value = COMPANY_NAME;
  sheet.getCell("A2").font = { bold: true };
  const meta: [string, string][] = [
    [t("reports.hdrGenerated"), generated],
    [t("reports.hdrPeriod"), `${dmy(from)} - ${dmy(to)}`],
    [t("reports.hdrBranch"), scope.label],
    [t("reports.hdrAccount"), selected ? `${selected.code} — ${selected.name}` : t(config.allAccountsKey)],
    [t("reports.hdrGeneratedUsername"), session.user.name ?? session.user.email ?? ""],
    [t("reports.hdrReportFileName"), `${title} - ${fileStamp}`],
  ];
  meta.forEach(([label, value], i) => {
    sheet.getCell(4 + i, 1).value = label;
    sheet.getCell(4 + i, 2).value = value;
  });

  while (sheet.rowCount < 4 + meta.length) sheet.addRow([]);
  writeHeader(sheet, [
    t("reports.colTransactionDate"),
    t("reports.colTransactionDescription"),
    t("reports.colTellerUserId"),
    t("reports.colBankDebit"),
    t("reports.colBankCredit"),
    t("reports.colBalance"),
  ]);

  const addLine = (when: Date, description: string, user: string, debit: number, credit: number, balance: number) => {
    const row = sheet.addRow([when, description, user, debit, credit, balance]);
    row.getCell(1).numFmt = "dd/mm/yy hh:mm:ss";
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    for (let c = 4; c <= 6; c++) row.getCell(c).numFmt = RP2_FORMAT;
    return row;
  };

  addLine(stamp(from, "00:00:00"), t("reports.bankOpeningRow"), "", 0, 0, statement.opening).font = { bold: true };
  for (const r of statement.rows) {
    const reference = selected ? r.sourceNo : `${r.sourceNo} · ${r.accountCode} ${r.accountName}`;
    const description = r.description ? `${r.description}\n${reference}` : reference;
    addLine(stamp(r.date, r.time), description, r.userId, r.debit, r.credit, r.balance);
  }
  const total = sheet.addRow([t("reports.totalRow"), "", "", statement.totalDebit, statement.totalCredit, statement.closing]);
  total.font = { bold: true };
  total.eachCell((cell) => (cell.border = { top: { style: "thin" } }));
  for (let c = 4; c <= 6; c++) total.getCell(c).numFmt = RP2_FORMAT;
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  const accountCode = selected?.code ?? "ALL";
  return xlsxResponse(workbook, `${config.filePrefix}-${outletCode}-${accountCode}-${from}_to_${to}-${fileStamp}.xlsx`);
}
