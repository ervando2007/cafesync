"use client";

import { CheckCircleIcon, PrinterIcon, XIcon } from "@/app/ui/pos/icons";
import type { OrderDetail } from "@/lib/pos";
import { useI18n } from "@/app/i18n-provider";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function ReceiptModal({
  order,
  onClose,
}: {
  order: OrderDetail;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-white print:p-0">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-7 w-7" />
            </span>
            <p className="mt-3 text-lg font-bold text-gray-900">{t("pos.paymentSuccessful")}</p>
            <p className="text-sm text-gray-500">{order.orderNo}</p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-dashed border-gray-200 pt-4">
            {order.items.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.qty} x {item.name}
                </span>
                <span className="font-medium text-gray-900">{formatRp(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-dashed border-gray-200 pt-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t("pos.subtotal")}</span>
              <span>{formatRp(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t("pos.discount")}</span>
              <span>-{formatRp(order.discountTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t("pos.tax")}</span>
              <span>{formatRp(order.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t("pos.serviceCharge")}</span>
              <span>{formatRp(order.serviceChargeTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>{t("pos.total")}</span>
              <span className="text-amber-700">{formatRp(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PrinterIcon className="h-4 w-4" />
            {t("pos.printReceipt")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-700 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            <XIcon className="h-4 w-4" />
            {t("pos.newOrder")}
          </button>
        </div>
      </div>
    </div>
  );
}
