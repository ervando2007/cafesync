import { resolveLedgerScope } from "@/lib/ledger";
import { formatDuration, getAttendanceEmployees, getAttendanceReport, parseAttendanceStatus, parseUserId, summarizeAttendance } from "@/lib/attendance";
import { COMPANY_NAME, firstDayOfMonth, isoDateOr, today } from "@/lib/report-labels";
import { applyBaseFont, newWorkbook, writeHeader, xlsxResponse } from "@/lib/xlsx-report";
import { getT } from "@/lib/i18n/server";
import { authorizeMenuRoute } from "@/lib/menu-access";

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-04-11" → "11-04-2026" */
const dmy = (iso: string) => iso.split("-").reverse().join("-");

export async function GET(request: Request) {
  const session = await authorizeMenuRoute("reports.attendance");
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const { t } = await getT();
  const scope = await resolveLedgerScope(session, url.searchParams.get("outlet") ?? undefined, t("reports.allOutlets"));
  const from = isoDateOr(url.searchParams.get("from"), firstDayOfMonth());
  const to = isoDateOr(url.searchParams.get("to"), today());
  const userId = parseUserId(url.searchParams.get("user"));
  const status = parseAttendanceStatus(url.searchParams.get("status"));
  const rows = await getAttendanceReport({ outletIds: scope.outletIds, from, to, userId, status });
  const employeeName = userId
    ? ((await getAttendanceEmployees(scope.outletIds)).find((e) => e.id === userId)?.name ?? String(userId))
    : t("attendance.allEmployees");
  const statusLabel =
    status === "OPEN"
      ? t("attendance.statusIn")
      : status === "DONE"
        ? t("attendance.statusDone")
        : status === "MISSED"
          ? t("attendance.statusMissed")
          : t("attendance.statusAll");

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const generated = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const title = t("attendance.reportTitle");

  const { workbook, sheet } = newWorkbook("Report");
  sheet.columns = [{ width: 13 }, { width: 26 }, { width: 24 }, { width: 11 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 10 }, { width: 30 }, { width: 30 }];

  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 13 };
  sheet.getCell("A2").value = COMPANY_NAME;
  sheet.getCell("A2").font = { bold: true };
  const meta: [string, string][] = [
    [t("reports.hdrGenerated"), generated],
    [t("reports.hdrPeriod"), `${dmy(from)} - ${dmy(to)}`],
    [t("reports.hdrBranch"), scope.label],
    [t("attendance.colEmployee"), employeeName],
    [t("attendance.colStatus"), statusLabel],
    [t("reports.hdrGeneratedUsername"), session.user.name ?? session.user.email ?? ""],
  ];
  meta.forEach(([label, value], i) => {
    sheet.getCell(4 + i, 1).value = label;
    sheet.getCell(4 + i, 2).value = value;
  });

  sheet.addRow([]);
  writeHeader(sheet, [
    t("attendance.colDate"),
    t("attendance.colEmployee"),
    t("attendance.colOutlet"),
    t("attendance.colIn"),
    t("attendance.colOutDate"),
    t("attendance.colOut"),
    t("attendance.colDuration"),
    t("attendance.colSource"),
    t("attendance.colNoteIn"),
    t("attendance.colNoteOut"),
  ]);

  for (const r of rows) {
    const [y, m, d] = r.workDate.split("-").map(Number);
    const row = sheet.addRow([
      // UTC midnight so the cell shows the calendar date regardless of server timezone.
      new Date(Date.UTC(y, m - 1, d)),
      r.employeeName,
      r.outletName,
      r.clockIn,
      r.clockOutAt ? dmy(r.clockOutAt.slice(0, 10)) : "",
      r.clockOut ?? (r.missedOut ? t("attendance.statusMissed") : t("attendance.statusIn")),
      formatDuration(r.durationMinutes),
      r.source === "DEVICE" ? t("attendance.sourceDevice") : t("attendance.sourceWeb"),
      r.noteIn ?? "",
      r.noteOut ?? "",
    ]);
    row.getCell(1).numFmt = "dd-mm-yyyy";
  }

  const s = summarizeAttendance(rows);
  sheet.addRow([]);
  const total = sheet.addRow([t("reports.totalRow"), `${s.records} ${t("attendance.summaryRecords")}`, "", "", "", "", formatDuration(s.totalMinutes)]);
  total.font = { bold: true };
  applyBaseFont(sheet);

  const outletCode = scope.outlets.find((o) => o.id === scope.selectedOutletId)?.code ?? "ALL";
  return xlsxResponse(workbook, `attendance-report-${outletCode}-${from}_to_${to}-${stamp}.xlsx`);
}
