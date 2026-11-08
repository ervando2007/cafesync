import { requireRole } from "@/lib/auth-guard";
import { resolveLedgerScope } from "@/lib/ledger";
import { getSalesRecap, MEAL_TIMES, parseSalesRecapParams, SALES_TYPES } from "@/lib/sales-report";
import { mealTimeLabel, salesRecapHeaders, salesTypeLabel } from "@/lib/sales-report-labels";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ParamSelect, ReportDownload, TimeRangeSelect } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];

function rp(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

type SalesSearchParams = {
  outlet?: string;
  from?: string;
  to?: string;
  tf?: string;
  tt?: string;
  days?: string;
  type?: string;
  meal?: string;
};

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<SalesSearchParams> }) {
  const session = await requireRole(ALLOWED_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());
  const filters = parseSalesRecapParams((k) => params[k as keyof SalesSearchParams]);

  const rows = await getSalesRecap({ outletIds: scope.outletIds, from, to, ...filters });

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const summary = [
    { label: t("reports.summaryBills"), value: new Set(rows.map((r) => r.orderNo)).size.toLocaleString("id-ID") },
    { label: t("reports.summaryItems"), value: sum((r) => r.qty).toLocaleString("id-ID") },
    { label: t("reports.colSubtotal"), value: rp(sum((r) => r.subtotal)) },
    { label: t("reports.colBillDiscount"), value: rp(sum((r) => r.menuDiscount + r.billDiscount)) },
    { label: t("reports.colNettSales"), value: rp(sum((r) => r.nettSales)) },
    { label: t("reports.colServiceChargeTotal"), value: rp(sum((r) => r.serviceCharge)) },
    { label: t("reports.colTaxTotal"), value: rp(sum((r) => r.tax)) },
    { label: t("reports.colGrandTotalLine"), value: rp(sum((r) => r.grandTotal)) },
  ];

  const query = new URLSearchParams({
    outlet: String(scope.selectedOutletId),
    from,
    to,
    tf: filters.timeFrom,
    tt: filters.timeTo,
    days: filters.days,
    ...(filters.salesType ? { type: filters.salesType } : {}),
    ...(filters.mealTime ? { meal: filters.mealTime } : {}),
  }).toString();
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  const headers = salesRecapHeaders(t);

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.salesReport")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <TimeRangeSelect timeFrom={filters.timeFrom} timeTo={filters.timeTo} />
        <ParamSelect
          param="days"
          value={filters.days === "ALL" ? "" : filters.days}
          options={[
            { value: "", label: t("reports.daysAll") },
            { value: "WEEKDAY", label: t("reports.daysWeekday") },
            { value: "WEEKEND", label: t("reports.daysWeekend") },
          ]}
        />
        <ParamSelect
          param="type"
          value={filters.salesType ?? ""}
          options={[
            { value: "", label: t("reports.salesTypeAll") },
            ...SALES_TYPES.map((s) => ({ value: s, label: salesTypeLabel(t, s) })),
          ]}
        />
        <ParamSelect
          param="meal"
          value={filters.mealTime ?? ""}
          options={[
            { value: "", label: t("reports.mealTimeAll") },
            ...MEAL_TIMES.map((m) => ({ value: m, label: mealTimeLabel(t, m) })),
          ]}
        />
        <ReportDownload
          exportUrl={`/reports/sales/export?${query}`}
          filename={`sales-report-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("reports.mealTimeHint")}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-gray-500">{s.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t("reports.salesRecapTitle")}</h2>
            <p className="text-xs text-gray-500">
              {COMPANY_NAME} · {scope.label} ·{" "}
              {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  {headers.map((h, i) => (
                    <th key={h} className={`whitespace-nowrap px-3 py-3 font-medium ${i >= 9 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("inventory.noSalesInPeriod")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{formatReportDate(r.salesDate, locale)}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-700">{r.salesTime}</td>
                      <td className="px-3 py-2 text-gray-600">{mealTimeLabel(t, r.mealTime)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.branch}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{salesTypeLabel(t, r.salesType)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{r.menu}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-500">{r.menuCode}</td>
                      <td className="px-3 py-2 text-gray-600">{r.menuCategory}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.menuCategoryDetail}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.subtotal)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.menuDiscount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.billDiscount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.nettSales)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.serviceCharge)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.tax)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rp(r.vat)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">{rp(r.grandTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
