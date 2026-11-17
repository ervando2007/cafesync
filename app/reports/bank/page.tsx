import { BANK_ACCOUNT_CODES } from "@/lib/bank-statement";
import { AccountStatement, type AccountStatementParams } from "@/app/ui/reports/account-statement";
import { requireMenu } from "@/lib/menu-access";

export default async function BankReportPage({ searchParams }: { searchParams: Promise<AccountStatementParams> }) {
  const session = await requireMenu("reports.bank");
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
