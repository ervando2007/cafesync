import ExcelJS from "exceljs";
import { getAccounts } from "@/lib/accounting";
import { getT } from "@/lib/i18n/server";
import { authorizeMenuRoute } from "@/lib/menu-access";
import { SUBMENU_ROLES } from "@/lib/menu-rules";

export async function GET() {
  const session = await authorizeMenuRoute("master_data", SUBMENU_ROLES["master_data.coa"]);
  if (session instanceof Response) return session;

  const { t } = await getT();
  const accounts = await getAccounts();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t("accounting.chartOfAccounts"));

  sheet.columns = [
    { header: t("accounting.colAccountCode"), key: "code", width: 14 },
    { header: t("accounting.colAccountName"), key: "name", width: 36 },
    { header: t("accounting.colAccountType"), key: "accountType", width: 14 },
    { header: t("accounting.colCashBank"), key: "isCashBank", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const account of accounts) {
    sheet.addRow({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      isCashBank: account.isCashBank ? t("common.yes") : t("common.no"),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chart-of-accounts.xlsx"`,
    },
  });
}
