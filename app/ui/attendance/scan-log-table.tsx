"use client";

import { useI18n } from "@/app/i18n-provider";
import type { ScanLogRow, ScanResult } from "@/lib/attendance-device";
import type { TranslationKey } from "@/lib/i18n/translate";

const RESULT_KEY: Record<ScanResult, TranslationKey> = {
  IN: "attendanceDevices.resultIn",
  OUT: "attendanceDevices.resultOut",
  DUPLICATE: "attendanceDevices.resultDuplicate",
  ALREADY_IN: "attendanceDevices.resultAlreadyIn",
  NO_OPEN_IN: "attendanceDevices.resultNoOpenIn",
  BREAK: "attendanceDevices.resultBreak",
  UNKNOWN_DEVICE: "attendanceDevices.resultUnknownDevice",
  UNKNOWN_PIN: "attendanceDevices.resultUnknownPin",
};

const RESULT_STYLE: Partial<Record<ScanResult, string>> = {
  IN: "bg-emerald-50 text-emerald-700",
  OUT: "bg-sky-50 text-sky-700",
  UNKNOWN_DEVICE: "bg-red-50 text-red-700",
  UNKNOWN_PIN: "bg-red-50 text-red-700",
  NO_OPEN_IN: "bg-amber-50 text-amber-800",
  ALREADY_IN: "bg-amber-50 text-amber-800",
};

const VERIFY: Record<number, string> = { 1: "Finger", 2: "Password", 3: "Card", 4: "Face", 6: "Vein" };
const STATUS_SCAN: Record<number, string> = { 0: "Scan In", 1: "Scan Out", 2: "Break In", 3: "Break Out" };

export function ScanLogTable({ scans }: { scans: ScanLogRow[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900">{t("attendanceDevices.scanLogTitle")}</h2>
        <p className="mt-0.5 text-xs text-gray-400">{t("attendanceDevices.scanLogDesc")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-400">
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colScanTime")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colDevice")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">PIN</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendance.colEmployee")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colVerify")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colKey")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colResult")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("attendanceDevices.colReceived")}</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">
                  {t("attendanceDevices.noScans")}
                </td>
              </tr>
            ) : (
              scans.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-gray-900">{s.scanAt}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">{s.deviceName ?? s.cloudId}</td>
                  <td className="px-4 py-2 font-mono text-gray-600">{s.pin}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-900">{s.employeeName ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{s.verify === null ? "-" : (VERIFY[s.verify] ?? s.verify)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                    {s.statusScan === null ? "-" : (STATUS_SCAN[s.statusScan] ?? s.statusScan)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${RESULT_STYLE[s.result] ?? "bg-gray-100 text-gray-600"}`}>
                      {t(RESULT_KEY[s.result])}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-gray-400">{s.receivedAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
