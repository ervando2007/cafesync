"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "@/app/ui/dashboard/icons";
import { SaveToDriveButton } from "@/app/ui/reports/save-to-drive-button";
import { useI18n } from "@/app/i18n-provider";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };
}

/** Single "as of" date (writes the `to` param) — Neraca is a point-in-time report. */
export function AsOfDateSelect({ value }: { value: string }) {
  const { t } = useI18n();
  const setParam = useSetParam();
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <CalendarIcon className="h-4 w-4 text-gray-400" />
      <span className="text-xs text-gray-500">{t("reports.asOf")}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && setParam("to", e.target.value)}
        className="text-sm text-gray-700 focus:outline-none"
      />
    </label>
  );
}

/** Time-of-day window (`tf` / `tt` params, HH:MM). Equal values mean the whole day. */
export function TimeRangeSelect({ timeFrom, timeTo }: { timeFrom: string; timeTo: string }) {
  const { t } = useI18n();
  const setParam = useSetParam();
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className="text-xs text-gray-500">{t("reports.timeWindow")}</span>
      <input
        type="time"
        value={timeFrom}
        onChange={(e) => e.target.value && setParam("tf", e.target.value)}
        className="text-sm text-gray-700 focus:outline-none"
      />
      <span className="text-gray-300">–</span>
      <input
        type="time"
        value={timeTo}
        onChange={(e) => e.target.value && setParam("tt", e.target.value)}
        className="text-sm text-gray-700 focus:outline-none"
      />
    </label>
  );
}

/** A select bound to one query param; the empty-value option removes the param. */
export function ParamSelect({
  param,
  value,
  options,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const setParam = useSetParam();
  return (
    <select
      value={value}
      onChange={(e) => setParam(param, e.target.value || null)}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ShowZeroToggle({ checked }: { checked: boolean }) {
  const { t } = useI18n();
  const setParam = useSetParam();
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setParam("zero", e.target.checked ? "1" : null)}
        className="accent-amber-700"
      />
      {t("reports.showZeroAccounts")}
    </label>
  );
}

export function AccountSelect({
  accounts,
  value,
}: {
  accounts: { id: number; code: string; name: string }[];
  value: number | null;
}) {
  const { t } = useI18n();
  const setParam = useSetParam();
  return (
    <select
      value={value ?? ""}
      onChange={(e) => setParam("account", e.target.value || null)}
      className="max-w-[16rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
    >
      <option value="">{t("reports.allAccounts")}</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} — {a.name}
        </option>
      ))}
    </select>
  );
}

export function ReportDownload({ exportUrl, filename }: { exportUrl: string; filename: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <a
        href={exportUrl}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {t("reports.download")}
      </a>
      <SaveToDriveButton exportUrl={exportUrl} filename={filename} />
    </div>
  );
}
