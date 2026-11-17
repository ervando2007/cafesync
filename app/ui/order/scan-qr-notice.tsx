"use client";

import { QrCodeIcon } from "@/app/ui/pos/icons";
import { OrderTopNav } from "@/app/ui/order/topnav";
import { SiteFooter } from "@/app/ui/order/site-footer";
import { useI18n } from "@/app/i18n-provider";

/** Shown when /order is opened without a valid outlet QR. */
export function ScanQrNotice() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-[#f9f8f6]">
      <OrderTopNav />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <QrCodeIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 text-lg font-bold text-gray-900">{t("order.scanQrTitle")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("order.scanQrDesc")}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
