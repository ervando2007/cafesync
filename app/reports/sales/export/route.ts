import { resolveLedgerScope } from "@/lib/ledger";
import { getSalesRecap, parseSalesRecapParams } from "@/lib/sales-report";
import { dayFilterLabel, mealTimeLabel, salesRecapHeaders, salesTypeLabel } from "@/lib/sales-report-labels";
import { COMPANY_NAME, firstDayOfMonth, isoDateOr, today } from "@/lib/report-labels";
import { authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, RP_FORMAT, writeHeader, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-04-11" → "11-04-2026", as in the template. */
const dmy = (iso: string) => iso.split("-").reverse().join("-");

export async function GET(request: Request) {
  const session = await authorizeExport(ALLOWED_ROLES);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const filters = parseSalesRecapParams((k) => url.searchParams.get(k));
  const rows = await getSalesRecap({ outletIds: scope.outletIds, from, to, ...filters });

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const generated = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const title = t("reports.salesRecapTitle");
  const reportFileName = `${title} - ${stamp}`;

  const { workbook, sheet } = newWorkbook("Report");
  sheet.columns = [
    { width: 13 }, { width: 10 }, { width: 11 }, { width: 24 }, { width: 13 }, { width: 30 }, { width: 13 },
    { width: 14 }, { width: 22 }, { width: 11 }, { width: 6 }, { width: 12 }, { width: 13 }, { width: 12 },
    { width: 15 }, { width: 18 }, { width: 11 }, { width: 10 }, { width: 13 },
  ];

  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 13 };
  sheet.getCell("A2").value = COMPANY_NAME;
  sheet.getCell("A2").font = { bold: true };
  const meta: [string, string][] = [
    [t("reports.hdrGenerated"), generated],
    [t("reports.hdrPeriod"), `${dmy(from)} - ${dmy(to)}`],
    [t("reports.hdrBranch"), scope.label],
    [t("reports.hdrTimeFrom"), filters.timeFrom],
    [t("reports.hdrTimeTo"), filters.timeTo],
    [t("reports.hdrTimePeriod"), dayFilterLabel(t, filters.days)],
    [t("reports.hdrSalesType"), filters.salesType ? salesTypeLabel(t, filters.salesType) : t("reports.salesTypeAll")],
    [t("reports.hdrMealTime"), filters.mealTime ? mealTimeLabel(t, filters.mealTime) : t("reports.mealTimeAll")],
    [t("reports.hdrGeneratedUsername"), session.user.name ?? session.user.email ?? ""],
    [t("reports.hdrReportFileName"), reportFileName],
  ];
  meta.forEach(([label, value], i) => {
    sheet.getCell(4 + i, 1).value = label;
    sheet.getCell(4 + i, 2).value = value;
  });

  // Header on row 15, data from row 16 — same positions as the template.
  while (sheet.rowCount < 14) sheet.addRow([]);
  writeHeader(sheet, salesRecapHeaders(t));

  for (const r of rows) {
    const [y, m, d] = r.salesDate.split("-").map(Number);
    const row = sheet.addRow([
      // UTC midnight so the cell shows the sale's calendar date regardless of server timezone.
      new Date(Date.UTC(y, m - 1, d)),
      r.salesTime,
      mealTimeLabel(t, r.mealTime),
      r.branch,
      salesTypeLabel(t, r.salesType),
      r.menu,
      r.menuCode,
      r.menuCategory,
      r.menuCategoryDetail,
      r.price,
      r.qty,
      r.subtotal,
      r.menuDiscount,
      r.billDiscount,
      r.nettSales,
      r.serviceCharge,
      r.tax,
      r.vat,
      r.grandTotal,
    ]);
    row.getCell(1).numFmt = "dd-mm-yyyy";
    for (let c = 10; c <= 19; c++) if (c !== 11) row.getCell(c).numFmt = RP_FORMAT;
  }
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `sales-report-${outletCode}-${from}_to_${to}-${stamp}.xlsx`);
}
