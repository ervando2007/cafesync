import { requireRole } from "@/lib/auth-guard";
import { resolveLedgerScope } from "@/lib/ledger";
import { getStockCategories, getStockReport, type StockLevel } from "@/lib/stock-report";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ParamSelect, ReportDownload } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];
const LEVELS: StockLevel[] = ["OK", "LOW", "OUT"];

function rp(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

function qty(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

const LEVEL_STYLE: Record<StockLevel, string> = {
  OK: "bg-emerald-50 text-emerald-700",
  LOW: "bg-amber-50 text-amber-700",
  OUT: "bg-red-50 text-red-700",
};

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; category?: string; level?: string }>;
}) {
  const session = await requireRole(ALLOWED_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());

  const categories = await getStockCategories();
  const category = categories.find((c) => c.id === Number(params.category)) ?? null;
  const level = LEVELS.find((l) => l === params.level) ?? null;
  const allItems = await getStockReport(scope.outletIds, from, to, category?.id ?? null);
  const items = level ? allItems.filter((i) => i.level === level) : allItems;

  const levelLabel = (l: StockLevel) =>
    l === "OK" ? t("reports.stockOk") : l === "LOW" ? t("reports.stockLow") : t("reports.stockOut");
  const sum = (f: (i: (typeof items)[number]) => number) => items.reduce((s, i) => s + f(i), 0);
  const summary = [
    { label: t("reports.summaryItemsCount"), value: items.length.toLocaleString("id-ID") },
    { label: `${t("reports.colOpeningStock")} (${t("reports.colValue")})`, value: rp(sum((i) => i.openingValue)) },
    { label: t("reports.stockOk"), value: String(allItems.filter((i) => i.level === "OK").length) },
    { label: t("reports.stockLow"), value: String(allItems.filter((i) => i.level === "LOW").length) },
    { label: t("reports.stockOut"), value: String(allItems.filter((i) => i.level === "OUT").length) },
  ];

  const query = new URLSearchParams({
    outlet: String(scope.selectedOutletId),
    from,
    to,
    ...(category ? { category: String(category.id) } : {}),
    ...(level ? { level } : {}),
  }).toString();
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  const group = "border-l border-gray-100 px-3 py-2 text-center font-semibold text-gray-600";
  const sub = "whitespace-nowrap px-3 py-2 text-right font-medium";
  const num = "whitespace-nowrap px-3 py-2 text-right tabular-nums";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.stockReport")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <ParamSelect
          param="category"
          value={category ? String(category.id) : ""}
          options={[{ value: "", label: t("reports.allCategories") }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
        <ParamSelect
          param="level"
          value={level ?? ""}
          options={[{ value: "", label: t("reports.allStockLevels") }, ...LEVELS.map((l) => ({ value: l, label: levelLabel(l) }))]}
        />
        <ReportDownload exportUrl={`/reports/stock/export?${query}`} filename={`stock-report-${outletCode}-${from}_to_${to}.xlsx`} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("reports.stockReportHint")}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-gray-500">{s.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t("reports.stockReportTitle")}</h2>
            <p className="text-xs text-gray-500">
              {COMPANY_NAME} · {scope.label} · {category?.name ?? t("reports.allCategories")} ·{" "}
              {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th colSpan={4} />
                  <th colSpan={2} className={group}>{t("reports.colOpeningStock")}</th>
                  <th className={group}>{t("reports.colPurchases")}</th>
                  <th className={group}>{t("reports.colUsage")}</th>
                  <th colSpan={2} className={`${group} bg-amber-50/60 text-amber-800`}>{t("reports.colRemainingStock")}</th>
                </tr>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">{t("reports.colSku")}</th>
                  <th className="px-3 py-2 font-medium">{t("reports.colIngredient")}</th>
                  <th className="px-3 py-2 font-medium">{t("reports.colCategory")}</th>
                  <th className="px-3 py-2 font-medium">{t("reports.colUnit")}</th>
                  <th className={`${sub} border-l border-gray-100`}>{t("reports.colQty")}</th>
                  <th className={sub}>{t("reports.colValue")}</th>
                  <th className={`${sub} border-l border-gray-100`}>{t("reports.colQty")}</th>
                  <th className={`${sub} border-l border-gray-100`}>{t("reports.colQty")}</th>
                  <th className={`${sub} border-l border-gray-100 bg-amber-50/60`}>{t("reports.colQty")}</th>
                  <th className="bg-amber-50/60 px-3 py-2 font-medium">{t("reports.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("reports.noStockItems")}
                    </td>
                  </tr>
                ) : (
                  items.map((i) => (
                    <tr key={i.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-500">{i.sku}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{i.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{i.category}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{i.unitName}</td>
                      <td className={`${num} border-l border-gray-50 text-gray-700`}>{qty(i.openingQty)}</td>
                      <td className={`${num} text-gray-700`}>{rp(i.openingValue)}</td>
                      <td className={`${num} border-l border-gray-50 text-emerald-700`}>{qty(i.purchaseQty)}</td>
                      <td className={`${num} border-l border-gray-50 text-red-600`}>{qty(i.usageQty)}</td>
                      <td className={`${num} border-l border-gray-50 font-semibold text-gray-900`}>{qty(i.closingQty)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_STYLE[i.level]}`}>
                          {levelLabel(i.level)}
                        </span>
                        <span className="ml-1 text-[10px] text-gray-400">
                          {t("reports.colReorderLevel")} {qty(i.reorderLevel)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50/60 font-semibold text-gray-900">
                    <td colSpan={4} className="px-3 py-3">{t("reports.totalRow")}</td>
                    <td />
                    <td className={num}>{rp(sum((i) => i.openingValue))}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
