"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ReportGranularity } from "@/lib/reports";

export function ViewModeSelect({
  view,
  dailyLabel,
  monthlyLabel,
}: {
  view: ReportGranularity;
  dailyLabel: string;
  monthlyLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: ReportGranularity) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 text-sm">
      <button
        type="button"
        onClick={() => handleChange("daily")}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          view === "daily" ? "bg-amber-700 text-white" : "text-gray-500 hover:text-gray-900"
        }`}
      >
        {dailyLabel}
      </button>
      <button
        type="button"
        onClick={() => handleChange("monthly")}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          view === "monthly" ? "bg-amber-700 text-white" : "text-gray-500 hover:text-gray-900"
        }`}
      >
        {monthlyLabel}
      </button>
    </div>
  );
}
