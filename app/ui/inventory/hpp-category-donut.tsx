"use client";

import { useState } from "react";
import type { HppByCategoryRow } from "@/lib/hpp";

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 68;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PALETTE = ["#b45309", "#2563eb", "#059669", "#dc2626", "#7c3aed", "#0891b2"];

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function HppCategoryDonut({ data }: { data: HppByCategoryRow[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.totalHpp, 0);

  const segments = data.reduce<
    Array<HppByCategoryRow & { index: number; color: string; length: number; offset: number }>
  >((acc, row, index) => {
    const percent = total > 0 ? row.totalHpp / total : 0;
    const length = percent * CIRCUMFERENCE;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    acc.push({ ...row, index, color: PALETTE[index % PALETTE.length], length, offset });
    return acc;
  }, []);

  const active = hoverIndex !== null ? segments[hoverIndex] : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">HPP by Category</h2>

      {segments.length === 0 ? (
        <p className="mt-8 py-8 text-center text-sm text-gray-400">No data in this period.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                {segments.map((seg) => (
                  <circle
                    key={seg.categoryName}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoverIndex === seg.index ? STROKE + 4 : STROKE}
                    strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                    strokeDashoffset={-seg.offset}
                    onMouseEnter={() => setHoverIndex(seg.index)}
                    onMouseLeave={() => setHoverIndex(null)}
                    className="cursor-pointer transition-[stroke-width]"
                  />
                ))}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[11px] text-gray-400">{active ? active.categoryName : "Total HPP"}</p>
              <p className="text-sm font-bold text-gray-900">
                {formatRp(active ? active.totalHpp : total)}
              </p>
            </div>
          </div>

          <ul className="w-full space-y-1.5">
            {segments.map((seg) => (
              <li key={seg.categoryName} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  {seg.categoryName}
                </span>
                <span className="font-medium text-gray-900">{formatRp(seg.totalHpp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
