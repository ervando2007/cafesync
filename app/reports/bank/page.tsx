import { requireRole } from "@/lib/auth-guard";
import { BANK_ACCOUNT_CODES } from "@/lib/bank-statement";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { AccountStatement, type AccountStatementParams } from "@/app/ui/reports/account-statement";

export default async function BankReportPage({ searchParams }: { searchParams: Promise<AccountStatementParams> }) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  return (
    <AccountStatement
      session={session}
      params={await searchParams}
      config={{
        accountCodes: BANK_ACCOUNT_CODES,
        navTitleKey: "nav.bankReport",
        titleKey: "reports.bankStatementTitle",
        allAccountsKey: "reports.allBankAccounts",
        exportPath: "/reports/bank/export",
        filePrefix: "bank-report",
      }}
    />
  );
}
