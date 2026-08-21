import { DineInIcon, TakeawayIcon } from "@/app/ui/dashboard/icons";
import type { RecentOrder } from "@/lib/dashboard-data";
import type { TranslateFn } from "@/lib/i18n/translate";

const STATUS_CLASSES: Record<RecentOrder["status"], string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  Paid: "bg-blue-50 text-blue-700",
  Preparing: "bg-amber-50 text-amber-700",
};

const STATUS_KEYS: Record<RecentOrder["status"], "dashboard.statusCompleted" | "dashboard.statusPaid" | "dashboard.statusPreparing"> = {
  Completed: "dashboard.statusCompleted",
  Paid: "dashboard.statusPaid",
  Preparing: "dashboard.statusPreparing",
};

export function RecentOrders({ data, t }: { data: RecentOrder[]; t: TranslateFn }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("dashboard.recentOrders")}</h2>
        <button
          type="button"
          className="text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          {t("dashboard.viewAllOrders")}
        </button>
      </div>

      <ul className="mt-4 space-y-3.5">
        {data.map((order) => {
          const Icon = order.channel === "dine_in" ? DineInIcon : TakeawayIcon;
          return (
            <li key={order.id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{order.id}</p>
                <p className="text-xs text-gray-500">{order.channelLabel}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">{order.amount}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[order.status]}`}
                >
                  {t(STATUS_KEYS[order.status])}
                </span>
                <p className="mt-1 text-[11px] text-gray-400">{order.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
