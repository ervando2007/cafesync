"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/app/ui/pos/icons";
import { getMyShiftDetail } from "@/app/pos/shift-actions";
import { useI18n } from "@/app/i18n-provider";
import { formatReportDate } from "@/lib/report-labels";
import type { ShiftDetail } from "@/lib/shift-summary";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const hm = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

const METHOD_KEY = {
  CASH: "pos.cash",
  BANK_TRANSFER: "pos.bankTransfer",
  QRIS: "pos.qris",
  CARD: "pos.card",
  OTHER: "pos.other",
} as const;

export function ShiftDetailModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const [detail, setDetail] = useState<ShiftDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getMyShiftDetail()
      .then((d) => active && setDetail(d))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("pos.shiftDetailTitle")}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t("common.close")}>
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {failed ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{t("common.somethingWentWrong")}</p>
        ) : !detail ? (
          <p className="mt-6 text-center text-sm text-gray-400">{t("common.loading")}</p>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
              {detail.isIn ? (
                <>
                  <p className="font-semibold">{detail.outletName}</p>
                  <p className="mt-1 text-gray-600">
                    {t("pos.shiftInSinceFull", {
                      date: formatReportDate(detail.date, locale),
                      time: detail.clockIn ?? "",
                      duration: hm(detail.durationMinutes ?? 0),
                    })}
                  </p>
                </>
              ) : (
                <p className="text-gray-600">{t("pos.shiftNotInDesc", { date: formatReportDate(detail.date, locale) })}</p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">{t("pos.shiftPaidOrders")}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{detail.paidCount}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">{t("pos.shiftSales")}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{rp(detail.paidTotal)}</p>
              </div>
            </div>

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("pos.shiftByMethod")}</h3>
            <div className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
              {detail.byMethod.length === 0 ? (
                <p className="px-4 py-3 text-gray-400">{t("pos.shiftNoSales")}</p>
              ) : (
                detail.byMethod.map((m) => (
                  <div key={m.method} className="flex items-center justify-between px-4 py-2.5">
                    <span>
                      {m.method in METHOD_KEY ? t(METHOD_KEY[m.method as keyof typeof METHOD_KEY]) : m.method}
                      <span className="ml-1 text-xs text-gray-400">×{m.count}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{rp(m.amount)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t("pos.shiftHeldOrders", { count: detail.openCount })}</span>
                <span className="tabular-nums">{rp(detail.openTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t("pos.shiftVoidedOrders", { count: detail.voidedCount })}</span>
                <span className="tabular-nums">{rp(detail.voidedTotal)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">{t("pos.shiftDetailHint")}</p>
          </>
        )}
      </div>
    </div>
  );
}
