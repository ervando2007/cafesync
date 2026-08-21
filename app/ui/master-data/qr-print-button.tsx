"use client";

import { useI18n } from "@/app/i18n-provider";

export function QrPrintButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
    >
      {t("masterData.printAll")}
    </button>
  );
}
