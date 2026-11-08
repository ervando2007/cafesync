import type { TranslateFn } from "@/lib/i18n/translate";
import type { DayFilter, MealTime, SalesType } from "@/lib/sales-report";

export function mealTimeLabel(t: TranslateFn, meal: MealTime): string {
  return {
    BREAKFAST: t("reports.mealBreakfast"),
    LUNCH: t("reports.mealLunch"),
    DINNER: t("reports.mealDinner"),
    SUPPER: t("reports.mealSupper"),
  }[meal];
}

export function salesTypeLabel(t: TranslateFn, type: SalesType): string {
  return {
    DINE_IN_STAFF: t("reports.salesTypeDineInStaff"),
    DINE_IN_QR: t("reports.salesTypeDineInQr"),
    TAKEAWAY: t("reports.salesTypeTakeaway"),
    DELIVERY: t("reports.salesTypeDelivery"),
    POS: t("reports.salesTypePos"),
  }[type];
}

export function dayFilterLabel(t: TranslateFn, days: DayFilter): string {
  return { ALL: t("reports.daysAll"), WEEKDAY: t("reports.daysWeekday"), WEEKEND: t("reports.daysWeekend") }[days];
}

/** The 19 template columns, in order (SALESREPORT.xlsx row 15). */
export function salesRecapHeaders(t: TranslateFn): string[] {
  return [
    t("reports.colSalesDate"),
    t("reports.colSalesTime"),
    t("reports.colMealTime"),
    t("reports.colBranch"),
    t("reports.colSalesType"),
    t("reports.colMenu"),
    t("reports.colMenuCode"),
    t("reports.colMenuCategory"),
    t("reports.colMenuCategoryDetail"),
    t("reports.colPrice"),
    t("reports.colQty"),
    t("reports.colSubtotal"),
    t("reports.colMenuDiscount"),
    t("reports.colBillDiscount"),
    t("reports.colNettSales"),
    t("reports.colServiceChargeTotal"),
    t("reports.colTaxTotal"),
    t("reports.colVatTotal"),
    t("reports.colGrandTotalLine"),
  ];
}
