import type { TranslateFn } from "@/lib/i18n/translate";
import type { StatementLabels } from "@/lib/ledger";

/** Business name printed on report headers (from RULES SISTEM CAFE.xlsx → MENU). */
export const COMPANY_NAME = "Hardi Coffee And Eatery";

export function statementLabels(t: TranslateFn): StatementLabels {
  return {
    sales: t("reports.stSales"),
    totalSales: t("reports.stTotalSales"),
    cogs: t("reports.stCogs"),
    totalCogs: t("reports.stTotalCogs"),
    grossProfit: t("reports.stGrossProfit"),
    operatingExpenses: t("reports.stOperatingExpenses"),
    totalOperatingExpenses: t("reports.stTotalOperatingExpenses"),
    otherIncome: t("reports.stOtherIncome"),
    totalOtherIncome: t("reports.stTotalOtherIncome"),
    otherExpenses: t("reports.stOtherExpenses"),
    totalOtherExpenses: t("reports.stTotalOtherExpenses"),
    profitBeforeTax: t("reports.stProfitBeforeTax"),
    incomeTax: t("reports.stIncomeTax"),
    profitAfterTax: t("reports.stProfitAfterTax"),
    assets: t("reports.stAssets"),
    currentAssets: t("reports.stCurrentAssets"),
    totalCurrentAssets: t("reports.stTotalCurrentAssets"),
    otherAssets: t("reports.stOtherAssets"),
    totalOtherAssets: t("reports.stTotalOtherAssets"),
    fixedAssets: t("reports.stFixedAssets"),
    bookValue: t("reports.stBookValue"),
    totalAssets: t("reports.stTotalAssets"),
    liabilitiesHeading: t("reports.stLiabilities"),
    currentLiabilities: t("reports.stCurrentLiabilities"),
    totalCurrentLiabilities: t("reports.stTotalCurrentLiabilities"),
    longTermLiabilities: t("reports.stLongTermLiabilities"),
    totalLongTermLiabilities: t("reports.stTotalLongTermLiabilities"),
    otherLiabilities: t("reports.stOtherLiabilities"),
    totalOtherLiabilities: t("reports.stTotalOtherLiabilities"),
    equity: t("reports.stEquity"),
    retainedEarningsPrior: t("reports.stRetainedPrior"),
    retainedEarningsCurrent: t("reports.stRetainedCurrent"),
    totalEquity: t("reports.stTotalEquity"),
    totalLiabilitiesEquity: t("reports.stTotalLiabilitiesEquity"),
  };
}

export function sourceTypeLabel(t: TranslateFn, sourceType: string): string {
  switch (sourceType) {
    case "ORDER_SALE":
      return t("reports.sourceOrderSale");
    case "ORDER_COGS":
      return t("reports.sourceOrderCogs");
    case "CASH_TXN":
      return t("reports.sourceCashTxn");
    default:
      return t("reports.sourceManual");
  }
}

/** "2026-07-02" → "02 Jul 2026" (id) / "Jul 2, 2026" (en). */
export function formatReportDate(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function firstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Accepts only YYYY-MM-DD; anything else falls back. */
export function isoDateOr(value: string | null | undefined, fallback: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}
