"use client";

import { useEffect, useState, useTransition } from "react";
import { clockInAction, clockOutAction } from "@/app/attendance/actions";
import { useI18n } from "@/app/i18n-provider";
import type { OutletOption } from "@/lib/pos";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function ClockCard({
  outlets,
  open,
}: {
  outlets: OutletOption[];
  /** The session still clocked in, or null when the user is out. */
  open: { outletName: string; date: string; clockIn: string } | null;
}) {
  const { t, locale } = useI18n();
  const now = useNow();
  const [outletId, setOutletId] = useState<number>(outlets[0]?.id ?? 0);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = open ? await clockOutAction({ note }) : await clockInAction({ outletId, note });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? t("common.somethingWentWrong") });
        return;
      }
      setNote("");
      setMessage({ type: "info", text: t(open ? "attendance.clockedOutSuccess" : "attendance.clockedInSuccess") });
    });
  }

  const dateLocale = locale === "id" ? "id-ID" : "en-US";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs text-gray-500">
            {now ? now.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : " "}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-gray-900">
            {now ? now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}
          </p>
          <div className="mt-3">
            {open ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {t("attendance.currentlyIn", { time: open.clockIn, date: open.date, outlet: open.outletName })}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {t("attendance.currentlyOut")}
              </span>
            )}
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {!open && (
            <div>
              <label className="text-xs text-gray-500">{t("attendance.colOutlet")}</label>
              {outlets.length === 0 ? (
                <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("attendance.noOutletAssigned")}</p>
              ) : (
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500">{t("attendance.note")}</label>
            <input
              value={note}
              maxLength={255}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("attendance.notePlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={isPending || (!open && outlets.length === 0)}
            className={`w-full rounded-xl py-3 text-base font-bold text-white disabled:opacity-50 ${
              open ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isPending ? t("common.saving") : open ? t("attendance.clockOut") : t("attendance.clockIn")}
          </button>
          {message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
