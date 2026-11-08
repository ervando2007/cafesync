import { accountStatementExport } from "@/lib/account-statement-export";
import { CASH_ACCOUNT_CODES } from "@/lib/bank-statement";

export async function GET(request: Request) {
  return accountStatementExport(request, {
    accountCodes: CASH_ACCOUNT_CODES,
    titleKey: "reports.cashStatementTitle",
    allAccountsKey: "reports.allBankAccounts",
    filePrefix: "cash-report",
  });
}
