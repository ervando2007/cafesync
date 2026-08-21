"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDownIcon } from "@/app/ui/icons";
import { StoreIcon } from "@/app/ui/dashboard/icons";
import type { OutletOption } from "@/lib/pos";

export function OutletSelect({
  outlets,
  selectedOutletId,
  paramName = "outlet",
}: {
  outlets: OutletOption[];
  selectedOutletId: number;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative">
      <StoreIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        value={selectedOutletId}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
      >
        {outlets.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
