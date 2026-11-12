"use client";

import { useState } from "react";
import type { CategorySlice } from "@/lib/dashboard-data";
import { useI18n } from "@/app/i18n-provider";

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 68;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SalesByCategoryChart({
  data,
  totalLabel,
}: {
  data: CategorySlice[];
  totalLabel: string;
}) {
  const { t } = useI18n();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const segments = data.reduce<
    Array<CategorySlice & { index: number; length: number; offset: number }>
  >((acc, slice, index) => {
    const length = (slice.percent / 100) * CIRCUMFERENCE;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    acc.push({ ...slice, index, length, offset });
    return acc;
  }, []);

  const active = hoverIndex !== null ? segments[hoverIndex] : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("dashboard.salesByCategory")}</h2>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
          {t("dashboard.thisWeek")}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-5">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {segments.map((seg) => (
                <circle
                  key={seg.name}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoverIndex === seg.index ? STROKE + 4 : STROKE}
                  strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  opacity={hoverIndex === null || hoverIndex === seg.index ? 1 : 0.45}
                  style={{ transition: "stroke-width 120ms, opacity 120ms" }}
                  onMouseEnter={() => setHoverIndex(seg.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              ))}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {active ? (
              <>
                <p className="text-xs text-gray-500">{active.name}</p>
                <p className="text-lg font-bold text-gray-900">{active.percent}%</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">{t("dashboard.totalSales")}</p>
                <p className="text-sm font-bold text-gray-900">{totalLabel}</p>
                <p className="text-xs text-gray-400">100%</p>
              </>
            )}
          </div>
        </div>

        <ul className="w-full flex-1 space-y-2.5">
          {segments.map((seg) => (
            <li
              key={seg.name}
              className="flex items-center justify-between text-sm"
              onMouseEnter={() => setHoverIndex(seg.index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <span className="flex items-center gap-2 text-gray-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                {seg.name}
              </span>
              <span className="font-medium text-gray-900">{seg.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
