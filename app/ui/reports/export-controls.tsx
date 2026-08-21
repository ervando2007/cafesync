"use client";

import { useI18n } from "@/app/i18n-provider";
import { SaveToDriveButton } from "@/app/ui/reports/save-to-drive-button";
import type { ReportGranularity } from "@/lib/reports";

export function ExportControls({
  exportPath,
  filenamePrefix,
  outletId,
  outletCode,
  view,
  from,
  to,
}: {
  exportPath: string;
  filenamePrefix: string;
  outletId: number;
  outletCode: string;
  view: ReportGranularity;
  from: string;
  to: string;
}) {
  const { t } = useI18n();
  const exportUrl = `${exportPath}?outlet=${outletId}&view=${view}&from=${from}&to=${to}`;
  const filename = `${filenamePrefix}-${outletCode}-${view}-${from}_to_${to}.xlsx`;

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
