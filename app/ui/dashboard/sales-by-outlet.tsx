import type { OutletSales } from "@/lib/dashboard-data";
import type { TranslateFn } from "@/lib/i18n/translate";

export function SalesByOutlet({ data, t }: { data: OutletSales[]; t: TranslateFn }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("dashboard.salesByOutlet")}</h2>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
          {t("dashboard.thisWeek")}
        </span>
      </div>

      <ul className="mt-4 space-y-4">
        {data.map((outlet) => (
          <li key={outlet.name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-gray-700">{outlet.name}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-semibold text-gray-900">{outlet.amount}</span>
                <span className="text-xs text-gray-400">{outlet.percent}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-amber-700"
                style={{ width: `${outlet.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
