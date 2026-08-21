import type { ComponentType } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@/app/ui/dashboard/icons";
import type { StatCard as StatCardData } from "@/lib/dashboard-data";

const ACCENT_CLASSES: Record<StatCardData["accent"], string> = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  teal: "bg-teal-50 text-teal-600",
};

export function StatCard({
  data,
  icon: Icon,
}: {
  data: StatCardData;
  icon: ComponentType<{ className?: string }>;
}) {
  const DeltaIcon = data.deltaDirection === "up" ? ArrowUpRightIcon : ArrowDownRightIcon;
  const deltaColor = data.isGood ? "text-emerald-600" : "text-red-600";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ACCENT_CLASSES[data.accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-xs leading-tight text-gray-500 sm:text-sm">{data.label}</p>
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">{data.value}</p>

      <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
        <DeltaIcon className="h-3.5 w-3.5" />
        {data.deltaLabel}
      </p>
    </div>
  );
}
