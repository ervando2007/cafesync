import { resolveLedgerScope } from "@/lib/ledger";
import { getStockCategories, getStockReport, type StockLevel } from "@/lib/stock-report";
import { COMPANY_NAME, firstDayOfMonth, isoDateOr, today } from "@/lib/report-labels";
import { authorizeExport } from "@/lib/report-route";
import { applyBaseFont, newWorkbook, RP_FORMAT, writeHeader, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];
const LEVELS: StockLevel[] = ["OK", "LOW", "OUT"];
const QTY_FORMAT = "#,##0.###;(#,##0.###);\"-\"";

const pad = (n: number) => String(n).padStart(2, "0");
const dmy = (iso: string) => iso.split("-").reverse().join("-");

export async function GET(request: Request) {
  const session = await authorizeExport(ALLOWED_ROLES);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const categories = await getStockCategories();
  const category = categories.find((c) => c.id === Number(url.searchParams.get("category"))) ?? null;
  const level = LEVELS.find((l) => l === url.searchParams.get("level")) ?? null;
  const all = await getStockReport(scope.outletIds, from, to, category?.id ?? null);
  const items = level ? all.filter((i) => i.level === level) : all;
  const levelLabel = (l: StockLevel) =>
    l === "OK" ? t("reports.stockOk") : l === "LOW" ? t("reports.stockLow") : t("reports.stockOut");

  const now = new Date();
  const fileStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const generated = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const title = t("reports.stockReportTitle");

  const { workbook, sheet } = newWorkbook("Report");
  sheet.columns = [
    { width: 12 }, { width: 30 }, { width: 16 }, { width: 11 },
    { width: 11 }, { width: 14 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 13 }, { width: 13 },
  ];

  // Same header block as the Sales / Bank reports.
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 13 };
  sheet.getCell("A2").value = COMPANY_NAME;
  sheet.getCell("A2").font = { bold: true };
  const meta: [string, string][] = [
    [t("reports.hdrGenerated"), generated],
    [t("reports.hdrPeriod"), `${dmy(from)} - ${dmy(to)}`],
    [t("reports.hdrBranch"), scope.label],
    [t("reports.hdrCategory"), category?.name ?? t("reports.allCategories")],
    [t("reports.hdrStockStatus"), level ? levelLabel(level) : t("reports.allStockLevels")],
    [t("reports.hdrGeneratedUsername"), session.user.name ?? session.user.email ?? ""],
    [t("reports.hdrReportFileName"), `${title} - ${fileStamp}`],
  ];
  meta.forEach(([label, value], i) => {
    sheet.getCell(4 + i, 1).value = label;
    sheet.getCell(4 + i, 2).value = value;
  });
  while (sheet.rowCount < 4 + meta.length) sheet.addRow([]);

  // Two header rows: group names over the Qty (and opening Value) columns.
  const qtyLabel = t("reports.colQty");
  const groupRow = writeHeader(sheet, [
    "", "", "", "",
    t("reports.colOpeningStock"), "", t("reports.colPurchases"), t("reports.colUsage"),
    t("reports.colRemainingStock"), "", "",
  ]);
  const fixedLabels = [t("reports.colSku"), t("reports.colIngredient"), t("reports.colCategory"), t("reports.colUnit")];
  const headerRow = writeHeader(sheet, [
    ...fixedLabels,
    qtyLabel, t("reports.colValue"), qtyLabel, qtyLabel,
    qtyLabel, t("reports.colReorderLevel"), t("reports.colStatus"),
  ]);
  const g = groupRow.number;
  for (const [a, b] of [["E", "F"], ["I", "K"]]) {
    sheet.mergeCells(`${a}${g}:${b}${g}`);
    sheet.getCell(`${a}${g}`).alignment = { horizontal: "center", vertical: "middle" };
  }
  for (const c of ["G", "H"]) sheet.getCell(`${c}${g}`).alignment = { horizontal: "center", vertical: "middle" };
  ["A", "B", "C", "D"].forEach((c, i) => {
    sheet.mergeCells(`${c}${g}:${c}${headerRow.number}`);
    sheet.getCell(`${c}${g}`).value = fixedLabels[i];
    sheet.getCell(`${c}${g}`).alignment = { vertical: "middle" };
  });

  for (const i of items) {
    const row = sheet.addRow([
      i.sku, i.name, i.category, i.unitName,
      i.openingQty, i.openingValue, i.purchaseQty, i.usageQty,
      i.closingQty, i.reorderLevel, levelLabel(i.level),
    ]);
    for (const c of [5, 7, 8, 9, 10]) row.getCell(c).numFmt = QTY_FORMAT;
    row.getCell(6).numFmt = RP_FORMAT;
  }
  const total = sheet.addRow([
    t("reports.totalRow"), "", "", "", null, items.reduce((s, i) => s + i.openingValue, 0), null, null, null, null, null,
  ]);
  total.font = { bold: true };
  for (let c = 1; c <= 11; c++) total.getCell(c).border = { top: { style: "thin" } };
  total.getCell(6).numFmt = RP_FORMAT;
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `stock-report-${outletCode}-${from}_to_${to}-${fileStamp}.xlsx`);
}
