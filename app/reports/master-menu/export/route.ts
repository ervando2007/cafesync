import { hasOutletAccess } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getMasterMenu } from "@/lib/master-menu";
import { COMPANY_NAME, formatReportDate, today } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES, authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, writeHeader, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const session = await authorizeExport(ACCOUNTING_REPORT_ROLES);
  if (session instanceof Response) return session;

  const outletId = Number(new URL(request.url).searchParams.get("outlet") ?? 0);
  if (!outletId || !(await hasOutletAccess(session, outletId))) {
    return new Response("Forbidden", { status: 403 });
  }
  const outlet = (await getOutletsForUser(session)).find((o) => o.id === outletId);
  if (!outlet) return new Response("Forbidden", { status: 403 });

  const { t, locale } = await getT();
  const rows = await getMasterMenu(outletId);

  const { workbook, sheet } = newWorkbook(t("nav.masterMenu"));
  sheet.columns = [
    { width: 12 }, { width: 32 }, { width: 22 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 22 }, { width: 26 }, { width: 18 }, { width: 12 },
  ];
  // Template header: title, business name, blank, "Generated", blank, then the table.
  const title = sheet.addRow([t("nav.masterMenu")]);
  title.getCell(1).font = { bold: true, size: 13 };
  sheet.addRow([`${COMPANY_NAME} · ${outlet.name}`]).getCell(1).font = { bold: true };
  sheet.addRow([]);
  sheet.addRow([`Generated ${formatReportDate(today(), locale)}`]);
  sheet.addRow([]);
  writeHeader(sheet, [
    t("reports.colMenuId"),
    t("reports.colMenuName"),
    t("reports.colCategory"),
    t("reports.colTax"),
    t("reports.colOtherTax"),
    t("reports.colCustomerPrint"),
    t("reports.colSalesAccount"),
    t("reports.colCogsAccount"),
    t("reports.colDiscountAccount"),
    t("reports.colStatus"),
  ]);
  for (const r of rows) {
    sheet.addRow([
      r.menuId,
      r.name,
      r.category,
      t("reports.yesTax"),
      t("reports.yesServiceCharge"),
      t("reports.yes"),
      r.salesAccount,
      r.cogsAccount ? t("reports.cogsPerIngredient") : t("reports.noRecipe"),
      "-",
      r.active ? t("reports.active") : t("reports.notActive"),
    ]);
  }
  applyBaseFont(sheet);
  return xlsxResponse(workbook, `master-menu-${outlet.code}.xlsx`);
}
