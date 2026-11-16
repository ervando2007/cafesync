"use client";

import { useState } from "react";
import Link from "next/link";
import { SidebarShell } from "@/app/ui/sidebar-shell";
import { ShiftDetailModal } from "@/app/ui/pos/shift-detail-modal";
import { useI18n } from "@/app/i18n-provider";
import { formatReportDate } from "@/lib/report-labels";
import type { ShiftCard } from "@/lib/shift-summary";

export function PosSidebar({
  userName,
  userRole,
  avatarUrl,
  shift,
  visibleMenuKeys,
}: {
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  shift: ShiftCard;
  visibleMenuKeys: string[];
}) {
  const { t, locale } = useI18n();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <SidebarShell
        subtitle={t("nav.posSystem")}
        userName={userName}
        userRole={userRole}
        avatarUrl={avatarUrl}
        visibleMenuKeys={visibleMenuKeys}
        extra={
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/60">{t("pos.currentShift")}</p>
              {shift.isIn ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {t("pos.open")}
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                  {t("pos.shiftNotIn")}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-semibold">{formatReportDate(shift.date, locale)}</p>
            {shift.isIn ? (
              <p className="text-xs text-white/60">
                {t("pos.shiftInSince", { time: shift.clockIn ?? "", outlet: shift.outletName ?? "" })}
              </p>
            ) : (
              visibleMenuKeys.includes("attendance") && (
                <Link href="/attendance" className="text-xs text-white/60 underline hover:text-white">
                  {t("pos.shiftClockInFirst")}
                </Link>
              )
            )}
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="mt-1 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              {t("pos.viewShiftDetail")}
            </button>
          </div>
        }
      />
      {showDetail && <ShiftDetailModal onClose={() => setShowDetail(false)} />}
    </>
  );
}
