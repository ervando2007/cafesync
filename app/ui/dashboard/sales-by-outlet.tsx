import { ChevronDownIcon } from "@/app/ui/icons";
import type { OutletSales } from "@/lib/dashboard-data";

export function SalesByOutlet({ data }: { data: OutletSales[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Sales by Outlet</h2>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          This Week
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
        </button>
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

      <button
        type="button"
        className="mt-4 text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        View detailed report →
      </button>
    </div>
  );
}
