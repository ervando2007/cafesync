"use client";

import { useMemo, useRef, useState } from "react";
import type { SalesPoint } from "@/lib/dashboard-data";
import { useI18n } from "@/app/i18n-provider";

const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_VALUE = 30_000_000;
const TICKS = [0, 6, 12, 18, 24, 30].map((v) => v * 1_000_000);

function formatShortRp(value: number) {
  return `Rp ${(value / 1_000_000).toLocaleString("id-ID")}M`;
}

function formatFullRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function xAt(index: number, count: number) {
  return PAD_LEFT + (index / (count - 1)) * PLOT_W;
}

function yAt(value: number) {
  return PAD_TOP + PLOT_H - (value / MAX_VALUE) * PLOT_H;
}

export function SalesOverviewChart({ data }: { data: SalesPoint[] }) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        x: xAt(index, data.length),
        yThis: yAt(point.thisWeek),
        yLast: yAt(point.lastWeek),
      })),
    [data],
  );

  const thisWeekPath = points.map((p) => `${p.x},${p.yThis}`).join(" ");
  const lastWeekPath = points.map((p) => `${p.x},${p.yLast}`).join(" ");
  const baseline = yAt(0);
  const areaPath = `M${points[0].x},${baseline} ${points
    .map((p) => `L${p.x},${p.yThis}`)
    .join(" ")} L${points[points.length - 1].x},${baseline} Z`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const svgX = fraction * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const active = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("dashboard.salesOverview")}</h2>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
          {t("dashboard.daily")}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-amber-700" /> {t("dashboard.thisWeek")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full border-t-2 border-dashed border-gray-400" />
          {t("dashboard.lastWeek")}
        </span>
      </div>

      <div className="relative mt-3 h-60 w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="#e1e0d9"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yAt(tick) + 3} textAnchor="end" fontSize="9" fill="#898781">
                {formatShortRp(tick)}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b45309" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#salesArea)" />

          <polyline
            points={lastWeekPath}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={thisWeekPath}
            fill="none"
            stroke="#b45309"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <text
              key={p.day}
              x={p.x}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#898781"
            >
              {i === 0 || i === points.length - 1 || i === hoverIndex ? p.day : p.day.split(" ")[0]}
            </text>
          ))}

          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_TOP}
              y2={baseline}
              stroke="#c3c2b7"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {active && (
            <>
              <circle cx={active.x} cy={active.yThis} r={5} fill="#b45309" stroke="#fff" strokeWidth={2} />
              <circle cx={active.x} cy={active.yLast} r={4} fill="#9ca3af" stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(active.x / WIDTH) * 100}%`,
              top: `${(active.yThis / HEIGHT) * 100}%`,
            }}
          >
            <p className="font-semibold text-gray-900">{active.day}</p>
            <p className="mt-1 text-amber-700">{t("dashboard.thisWeek")}: {formatFullRp(active.thisWeek)}</p>
            <p className="text-gray-500">{t("dashboard.lastWeek")}: {formatFullRp(active.lastWeek)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
