import { ArrowRightIcon } from "@/app/ui/dashboard/icons";
import { CoffeeCupIcon } from "@/app/ui/icons";
import type { TopProduct } from "@/lib/dashboard-data";

export function TopProducts({ data }: { data: TopProduct[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Top Products</h2>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          This Week
        </button>
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

      <button
        type="button"
        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        View all products
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
