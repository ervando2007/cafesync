import { requireRole } from "@/lib/auth-guard";
import { CASH_ACCOUNT_CODES } from "@/lib/bank-statement";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { AccountStatement, type AccountStatementParams } from "@/app/ui/reports/account-statement";

export default async function CashReportPage({ searchParams }: { searchParams: Promise<AccountStatementParams> }) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  return (
    <AccountStatement
      session={session}
      params={await searchParams}
      config={{
        accountCodes: CASH_ACCOUNT_CODES,
        navTitleKey: "nav.cashReport",
        titleKey: "reports.cashStatementTitle",
        allAccountsKey: "reports.allBankAccounts",
        exportPath: "/reports/cash/export",
        filePrefix: "cash-report",
      }}
    />
  );
}
