import { requireRole } from "@/lib/auth-guard";
import { ATTENDANCE_ROLES, formatDuration, getOpenAttendance, getRecentAttendance } from "@/lib/attendance";
import { getOutletsForUser } from "@/lib/pos";
import { formatReportDate } from "@/lib/report-labels";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";
import { ClockCard } from "@/app/ui/attendance/clock-card";

export default async function AttendancePage() {
  const session = await requireRole(ATTENDANCE_ROLES);
  const { t, locale } = await getT();
  const userId = Number(session.user.id);
  const [open, recent, outlets] = await Promise.all([
    getOpenAttendance(userId),
    getRecentAttendance(userId),
    getOutletsForUser(session),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("nav.attendance")} title={t("attendance.clockTitle")} />

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <ClockCard
          outlets={outlets}
          open={
            open
              ? {
                  outletName: open.outletName,
                  date: formatReportDate(open.workDate, locale),
                  clockIn: open.clockIn.slice(0, 5),
                }
              : null
          }
        />

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t("attendance.myHistory")}</h2>
            <p className="text-xs text-gray-500">{t("attendance.myHistoryDesc")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">{t("attendance.colDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("attendance.colOutlet")}</th>
                  <th className="px-4 py-3 font-medium">{t("attendance.colIn")}</th>
                  <th className="px-4 py-3 font-medium">{t("attendance.colOut")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("attendance.colDuration")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("attendance.noRecords")}
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">{formatReportDate(r.workDate, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{r.outletName}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-900">{r.clockIn.slice(0, 5)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-900">
                        {r.clockOut ? (
                          <>
                            {r.clockOut.slice(0, 5)}
                            {r.outNextDay && <span className="ml-1 text-xs text-gray-400">(+1)</span>}
                          </>
                        ) : r.missedOut ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            {t("attendance.statusMissed")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {t("attendance.statusIn")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatDuration(r.durationMinutes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
