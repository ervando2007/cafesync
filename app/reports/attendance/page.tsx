import { requireRole } from "@/lib/auth-guard";
import { resolveLedgerScope } from "@/lib/ledger";
import {
  ATTENDANCE_REPORT_ROLES,
  formatDuration,
  getAttendanceEmployees,
  getAttendanceReport,
  parseAttendanceStatus,
  parseUserId,
  summarizeAttendance,
} from "@/lib/attendance";
import { COMPANY_NAME, firstDayOfMonth, formatReportDate, isoDateOr, today } from "@/lib/report-labels";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { ParamSelect, ReportDownload } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

type AttendanceSearchParams = { outlet?: string; from?: string; to?: string; user?: string; status?: string };

export default async function AttendanceReportPage({ searchParams }: { searchParams: Promise<AttendanceSearchParams> }) {
  const session = await requireRole(ATTENDANCE_REPORT_ROLES);
  const { t, locale } = await getT();
  const params = await searchParams;
  const scope = await resolveLedgerScope(session, params.outlet, t("reports.allOutlets"));
  const from = isoDateOr(params.from, firstDayOfMonth());
  const to = isoDateOr(params.to, today());
  const userId = parseUserId(params.user);
  const status = parseAttendanceStatus(params.status);

  const [rows, employees] = await Promise.all([
    getAttendanceReport({ outletIds: scope.outletIds, from, to, userId, status }),
    getAttendanceEmployees(scope.outletIds),
  ]);
  const s = summarizeAttendance(rows);
  const summary = [
    { label: t("attendance.summaryRecords"), value: s.records.toLocaleString("id-ID") },
    { label: t("attendance.summaryEmployees"), value: s.employees.toLocaleString("id-ID") },
    { label: t("attendance.summaryTotalHours"), value: formatDuration(s.totalMinutes) },
    { label: t("attendance.summaryStillIn"), value: s.stillIn.toLocaleString("id-ID") },
    { label: t("attendance.summaryMissedOut"), value: s.missedOut.toLocaleString("id-ID") },
  ];

  const query = new URLSearchParams({
    outlet: String(scope.selectedOutletId),
    from,
    to,
    ...(userId ? { user: String(userId) } : {}),
    ...(status !== "ALL" ? { status } : {}),
  }).toString();
  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.attendanceReport")}>
        <OutletSelect outlets={scope.outlets} selectedOutletId={scope.selectedOutletId} allLabel={t("reports.allOutlets")} />
        <DateRangeSelect from={from} to={to} />
        <ParamSelect
          param="user"
          value={userId ? String(userId) : ""}
          options={[{ value: "", label: t("attendance.allEmployees") }, ...employees.map((e) => ({ value: String(e.id), label: e.name }))]}
        />
        <ParamSelect
          param="status"
          value={status === "ALL" ? "" : status}
          options={[
            { value: "", label: t("attendance.statusAll") },
            { value: "OPEN", label: t("attendance.statusIn") },
            { value: "DONE", label: t("attendance.statusDone") },
            { value: "MISSED", label: t("attendance.statusMissed") },
          ]}
        />
        <ReportDownload
          exportUrl={`/reports/attendance/export?${query}`}
          filename={`attendance-report-${outletCode}-${from}_to_${to}.xlsx`}
        />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("attendance.reportHint")}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {summary.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-gray-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t("attendance.reportTitle")}</h2>
            <p className="text-xs text-gray-500">
              {COMPANY_NAME} · {scope.label} ·{" "}
              {t("reports.periodLabel", { from: formatReportDate(from, locale), to: formatReportDate(to, locale) })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colDate")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colEmployee")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colOutlet")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colIn")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colOut")}</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">{t("attendance.colDuration")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colSource")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colNoteIn")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{t("attendance.colNoteOut")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">
                      {t("attendance.noRecordsInPeriod")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{formatReportDate(r.workDate, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{r.employeeName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.outletName}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-900">{r.clockIn}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-900">
                        {r.clockOut ? (
                          <>
                            {r.clockOut}
                            {r.outNextDay && <span className="ml-1 text-gray-400">(+1)</span>}
                          </>
                        ) : r.missedOut ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                            {t("attendance.statusMissed")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                            {t("attendance.statusIn")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">{formatDuration(r.durationMinutes)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                        {r.source === "DEVICE" ? t("attendance.sourceDevice") : t("attendance.sourceWeb")}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.noteIn ?? ""}</td>
                      <td className="px-3 py-2 text-gray-600">{r.noteOut ?? ""}</td>
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
