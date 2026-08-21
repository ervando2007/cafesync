import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { hasOutletAccess } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getProfitLossReport, type ReportGranularity } from "@/lib/reports";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "ACCOUNTING"];

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
  const rows = await getProfitLossReport(outletId, from, to, view);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t("nav.profitLossReport"));

  sheet.columns = [
    { header: t("reports.colPeriod"), key: "period", width: 18 },
    { header: t("reports.colRevenue"), key: "revenue", width: 18 },
    { header: t("reports.colExpenses"), key: "expenses", width: 18 },
    { header: t("reports.colNetProfit"), key: "netProfit", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };

  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalNetProfit = 0;

  for (const row of rows) {
    sheet.addRow({
      period: row.period,
      revenue: row.revenue,
      expenses: row.expenses,
      netProfit: row.netProfit,
    });
    totalRevenue += row.revenue;
    totalExpenses += row.expenses;
    totalNetProfit += row.netProfit;
  }

  const totalRow = sheet.addRow({
    period: t("reports.totalRow"),
    revenue: totalRevenue,
    expenses: totalExpenses,
    netProfit: totalNetProfit,
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `profit-loss-report-${outlet.code}-${view}-${from}_to_${to}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
