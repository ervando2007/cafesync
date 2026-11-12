import { CoffeeCupIcon } from "@/app/ui/icons";
import type { TopProduct } from "@/lib/dashboard-data";
import type { TranslateFn } from "@/lib/i18n/translate";

export function TopProducts({ data, t }: { data: TopProduct[]; t: TranslateFn }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("dashboard.topProducts")}</h2>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
          {t("dashboard.thisWeek")}
        </span>
      </div>

      <ul className="mt-4 space-y-4">
        {data.map((product) => (
          <li key={product.rank} className="flex items-start gap-2.5">
            <span className="w-3 shrink-0 pt-0.5 text-xs font-semibold text-gray-400">
              {product.rank}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <CoffeeCupIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">{product.qtyLabel}</span>
                <span className="shrink-0 text-xs font-semibold text-gray-900">
                  {product.revenue}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
