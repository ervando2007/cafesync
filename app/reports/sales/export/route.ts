import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { hasOutletAccess } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getSalesReport, type ReportGranularity } from "@/lib/reports";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const hasRole = session.user.roles.some((role) => ALLOWED_ROLES.includes(role));
  if (!hasRole) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const outletId = Number(url.searchParams.get("outlet") ?? 0);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const view: ReportGranularity = url.searchParams.get("view") === "monthly" ? "monthly" : "daily";

  if (!outletId || !from || !to) {
    return new Response("Missing outlet/from/to", { status: 400 });
  }
  if (!(await hasOutletAccess(session, outletId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const outlets = await getOutletsForUser(session);
  const outlet = outlets.find((o) => o.id === outletId);
  if (!outlet) {
    return new Response("Forbidden", { status: 403 });
  }

  const { t } = await getT();
  const rows = await getSalesReport(outletId, `${from} 00:00:00`, `${to} 23:59:59`, view);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t("nav.salesReport"));

  sheet.columns = [
    { header: t("reports.colPeriod"), key: "period", width: 18 },
    { header: t("reports.colOrders"), key: "orderCount", width: 12 },
    { header: t("reports.colNetSales"), key: "netSales", width: 18 },
    { header: t("reports.colGrandTotal"), key: "grandTotal", width: 18 },
    { header: t("reports.colHpp"), key: "totalHpp", width: 18 },
    { header: t("reports.colGrossProfit"), key: "grossProfit", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };

  let totalOrders = 0;
  let totalNetSales = 0;
  let totalGrandTotal = 0;
  let totalHpp = 0;
  let totalGrossProfit = 0;

  for (const row of rows) {
    sheet.addRow({
      period: row.period,
      orderCount: row.orderCount,
      netSales: row.netSales,
      grandTotal: row.grandTotal,
      totalHpp: row.totalHpp,
      grossProfit: row.grossProfit,
    });
    totalOrders += row.orderCount;
    totalNetSales += row.netSales;
    totalGrandTotal += row.grandTotal;
    totalHpp += row.totalHpp;
    totalGrossProfit += row.grossProfit;
  }

  const totalRow = sheet.addRow({
    period: t("reports.totalRow"),
    orderCount: totalOrders,
    netSales: totalNetSales,
    grandTotal: totalGrandTotal,
    totalHpp: totalHpp,
    grossProfit: totalGrossProfit,
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `sales-report-${outlet.code}-${view}-${from}_to_${to}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
