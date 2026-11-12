import { BeanIcon, BottleIcon, CupIcon } from "@/app/ui/dashboard/icons";
import type { StockAlertItem } from "@/lib/dashboard-data";
import type { TranslateFn } from "@/lib/i18n/translate";

const ICONS: Record<StockAlertItem["icon"], typeof BottleIcon> = {
  bottle: BottleIcon,
  "bottle-syrup": BottleIcon,
  bean: BeanIcon,
  cup: CupIcon,
};

const STATUS_CLASSES: Record<StockAlertItem["status"], string> = {
  "Low Stock": "bg-red-50 text-red-600",
  "Reorder Soon": "bg-amber-50 text-amber-700",
};

const STATUS_KEYS: Record<StockAlertItem["status"], "dashboard.statusLowStock" | "dashboard.statusReorderSoon"> = {
  "Low Stock": "dashboard.statusLowStock",
  "Reorder Soon": "dashboard.statusReorderSoon",
};

export function StockAlert({ data, t }: { data: StockAlertItem[]; t: TranslateFn }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{t("dashboard.stockAlert")}</h2>

      <ul className="mt-4 space-y-3.5">
        {data.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.name} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.stockLabel}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[item.status]}`}
              >
                {t(STATUS_KEYS[item.status])}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
