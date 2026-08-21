"use client";

import { useI18n } from "@/app/i18n-provider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-center px-6 py-6">
        <p className="text-xs text-gray-400">{t("order.copyrightFooter")}</p>
      </div>
    </footer>
  );
}
