import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { hasOutletAccess } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getStockReport, type ReportGranularity } from "@/lib/reports";
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
  const rows = await getStockReport(outletId, `${from} 00:00:00`, `${to} 23:59:59`, view);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t("nav.stockReport"));

  sheet.columns = [
    { header: t("reports.colPeriod"), key: "period", width: 18 },
    { header: t("reports.colMovements"), key: "movementCount", width: 12 },
    { header: t("reports.colStockIn"), key: "stockInValue", width: 18 },
    { header: t("reports.colStockOut"), key: "stockOutValue", width: 20 },
    { header: t("reports.colNetAdjustment"), key: "netAdjustmentValue", width: 18 },
    { header: t("reports.colNetStockChange"), key: "netStockChange", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  let totalMovements = 0;
  let totalStockIn = 0;
  let totalStockOut = 0;
  let totalNetAdjustment = 0;
  let totalNetChange = 0;

  for (const row of rows) {
    sheet.addRow({
      period: row.period,
      movementCount: row.movementCount,
      stockInValue: row.stockInValue,
      stockOutValue: row.stockOutValue,
      netAdjustmentValue: row.netAdjustmentValue,
      netStockChange: row.netStockChange,
    });
    totalMovements += row.movementCount;
    totalStockIn += row.stockInValue;
    totalStockOut += row.stockOutValue;
    totalNetAdjustment += row.netAdjustmentValue;
    totalNetChange += row.netStockChange;
  }

  const totalRow = sheet.addRow({
    period: t("reports.totalRow"),
    movementCount: totalMovements,
    stockInValue: totalStockIn,
    stockOutValue: totalStockOut,
    netAdjustmentValue: totalNetAdjustment,
    netStockChange: totalNetChange,
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `stock-report-${outlet.code}-${view}-${from}_to_${to}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
