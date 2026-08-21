import { ChevronDownIcon } from "@/app/ui/icons";
import { BellIcon, CalendarIcon, StoreIcon } from "@/app/ui/dashboard/icons";
import type { TranslateFn } from "@/lib/i18n/translate";

export function DashboardTopbar({
  title,
  subtitle,
  notificationCount = 0,
  t,
}: {
  title: string;
  subtitle: string;
  notificationCount?: number;
  t: TranslateFn;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <StoreIcon className="h-4 w-4 text-gray-400" />
          {t("dashboard.allOutlets")}
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <CalendarIcon className="h-4 w-4 text-gray-400" />
          20 May 2024 - 26 May 2024
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <BellIcon className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
              {notificationCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
