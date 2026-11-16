import { requireRole } from "@/lib/auth-guard";
import { getAttendanceDevices, getRecentScans } from "@/lib/attendance-device";
import { getOutletsForManagement } from "@/lib/outlets";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";
import { DevicesManager } from "@/app/ui/attendance/devices-manager";
import { ScanLogTable } from "@/app/ui/attendance/scan-log-table";

export default async function AttendanceDevicesPage() {
  const session = await requireRole(["ADMIN"]);
  const { t } = await getT();
  const [devices, scans, outlets] = await Promise.all([
    getAttendanceDevices(),
    getRecentScans(),
    getOutletsForManagement(session),
  ]);
  const baseUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "") || "https://<domain>";
  const tokenConfigured = Boolean(process.env.ATTENDANCE_WEBHOOK_TOKEN);

  return (
    <>
      <PageHeader eyebrow={t("nav.settings")} title={t("nav.attendanceDevices")} />

      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("attendanceDevices.webhookTitle")}</h2>
          <p className="mt-1 text-xs text-gray-500">{t("attendanceDevices.webhookDesc")}</p>
          <code className="mt-3 block break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-800">
            {baseUrl}/api/attendance/webhook?token=&lt;ATTENDANCE_WEBHOOK_TOKEN&gt;
          </code>
          <p className={`mt-2 text-xs font-medium ${tokenConfigured ? "text-emerald-700" : "text-red-600"}`}>
            {tokenConfigured ? t("attendanceDevices.tokenConfigured") : t("attendanceDevices.tokenMissing")}
          </p>
        </div>

        <DevicesManager
          devices={devices}
          outlets={outlets.filter((o) => o.status === "ACTIVE").map((o) => ({ id: o.id, name: o.name }))}
        />

        <ScanLogTable scans={scans} />
      </div>
    </>
  );
}
