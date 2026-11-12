import { WalletIcon } from "@/app/ui/dashboard/icons";
import type { CashFlowSummary as CashFlowData } from "@/lib/dashboard-data";
import type { TranslateFn } from "@/lib/i18n/translate";

export function CashFlowSummary({ data, t }: { data: CashFlowData; t: TranslateFn }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{t("dashboard.cashFlowSummaryTitle")}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <WalletIcon className="h-5 w-5" />
        </span>

        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">{t("dashboard.openingBalance")}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{data.opening}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("dashboard.cashIn")}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">{data.cashIn}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("dashboard.cashOut")}</p>
            <p className="mt-1 text-sm font-semibold text-red-600">{data.cashOut}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("dashboard.closingBalance")}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{data.closing}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
