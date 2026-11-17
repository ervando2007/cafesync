import { CASH_ACCOUNT_CODES } from "@/lib/bank-statement";
import { AccountStatement, type AccountStatementParams } from "@/app/ui/reports/account-statement";
import { requireMenu } from "@/lib/menu-access";

export default async function CashReportPage({ searchParams }: { searchParams: Promise<AccountStatementParams> }) {
  const session = await requireMenu("reports.cash");
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
