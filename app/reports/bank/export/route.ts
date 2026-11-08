import { accountStatementExport } from "@/lib/account-statement-export";
import { BANK_ACCOUNT_CODES } from "@/lib/bank-statement";

export async function GET(request: Request) {
  return accountStatementExport(request, {
    accountCodes: BANK_ACCOUNT_CODES,
    titleKey: "reports.bankStatementTitle",
    allAccountsKey: "reports.allBankAccounts",
    filePrefix: "bank-report",
  });
}
