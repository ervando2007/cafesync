"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarIcon } from "@/app/ui/dashboard/icons";

export function DateRangeSelect({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <CalendarIcon className="h-4 w-4 text-gray-400" />
      <input
        type="date"
        value={from}
        max={to}
        onChange={(e) => handleChange("from", e.target.value)}
        className="text-sm text-gray-700 focus:outline-none"
      />
      <span className="text-gray-300">–</span>
      <input
        type="date"
        value={to}
        min={from}
        onChange={(e) => handleChange("to", e.target.value)}
        className="text-sm text-gray-700 focus:outline-none"
      />
    </div>
  );
}
