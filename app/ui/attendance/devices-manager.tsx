"use client";

import { useState, useTransition } from "react";
import { saveAttendanceDevice, type DeviceInput } from "@/app/settings/attendance-devices/actions";
import { useI18n } from "@/app/i18n-provider";
import type { AttendanceDevice } from "@/lib/attendance-device";

const INPUT = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none";

export function DevicesManager({
  devices,
  outlets,
}: {
  devices: AttendanceDevice[];
  outlets: { id: number; name: string }[];
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<DeviceInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(device?: AttendanceDevice) {
    setError(null);
    setForm(
      device
        ? { id: device.id, cloudId: device.cloudId, name: device.name, outletId: device.outletId, scanMode: device.scanMode, status: device.status }
        : { cloudId: "", name: "", outletId: outlets[0]?.id ?? 0, scanMode: "STATUS", status: "ACTIVE" },
    );
  }

  function save() {
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const result = await saveAttendanceDevice(form);
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setForm(null);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("attendanceDevices.devicesTitle")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("attendanceDevices.devicesDesc")}</p>
        </div>
        <button
          type="button"
          onClick={() => open()}
          className="rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          {t("attendanceDevices.addDevice")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("attendanceDevices.colName")}</th>
              <th className="px-5 py-3 font-medium">Cloud ID</th>
              <th className="px-5 py-3 font-medium">{t("attendance.colOutlet")}</th>
              <th className="px-5 py-3 font-medium">{t("attendanceDevices.colMode")}</th>
              <th className="px-5 py-3 font-medium">{t("attendanceDevices.colLastSeen")}</th>
              <th className="px-5 py-3 font-medium">{t("attendance.colStatus")}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                  {t("attendanceDevices.noDevices")}
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{d.cloudId}</td>
                  <td className="px-5 py-3 text-gray-600">{d.outletName}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {d.scanMode === "TOGGLE" ? t("attendanceDevices.modeToggle") : t("attendanceDevices.modeStatus")}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-gray-600">{d.lastSeenAt ?? "-"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {d.status === "ACTIVE" ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => open(d)} className="text-xs font-medium text-amber-700 hover:underline">
                      {t("common.edit")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {form.id ? t("attendanceDevices.editDevice") : t("attendanceDevices.addDevice")}
            </h3>
            {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500">Cloud ID</label>
                <input value={form.cloudId} onChange={(e) => setForm({ ...form, cloudId: e.target.value })} className={INPUT} />
                <p className="mt-1 text-xs text-gray-400">{t("attendanceDevices.cloudIdHint")}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("attendanceDevices.colName")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Revo R-W230N Blossom Park"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("attendance.colOutlet")}</label>
                <select value={form.outletId} onChange={(e) => setForm({ ...form, outletId: Number(e.target.value) })} className={INPUT}>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("attendanceDevices.colMode")}</label>
                <select
                  value={form.scanMode}
                  onChange={(e) => setForm({ ...form, scanMode: e.target.value === "TOGGLE" ? "TOGGLE" : "STATUS" })}
                  className={INPUT}
                >
                  <option value="STATUS">{t("attendanceDevices.modeStatus")}</option>
                  <option value="TOGGLE">{t("attendanceDevices.modeToggle")}</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">{t("attendanceDevices.modeHint")}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("attendance.colStatus")}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE" })}
                  className={INPUT}
                >
                  <option value="ACTIVE">{t("common.active")}</option>
                  <option value="INACTIVE">{t("common.inactive")}</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {isPending ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
