import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByNo } from "@/lib/customer-menu";
import { OrderTopNav } from "@/app/ui/order/topnav";
import { SiteFooter } from "@/app/ui/order/site-footer";
import { OrderStatusTimeline } from "@/app/ui/order/order-status-timeline";
import { getT } from "@/lib/i18n/server";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export default async function OrderTrackPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const order = await getOrderByNo(orderNo);
  if (!order) notFound();
  const { t } = await getT();

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f8f6]">
      <OrderTopNav />

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">{t("order.orderNumber")}</p>
              <p className="text-lg font-bold text-gray-900">{order.orderNo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{order.outletName}</p>
              {(order.tableName || order.guestName) && (
                <p className="text-sm font-medium text-gray-700">
                  {order.tableName ?? order.guestName}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <OrderStatusTimeline status={order.status} />
          </div>

          <ul className="mt-6 space-y-2 border-t border-dashed border-gray-200 pt-4">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between text-sm">
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
              <span>{t("pos.tax")}</span>
              <span>{formatRp(order.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>{t("pos.total")}</span>
              <span className="text-amber-700">{formatRp(order.grandTotal)}</span>
            </div>
          </div>

          {order.status !== "PAID" &&
            order.status !== "CANCELLED" &&
            order.status !== "REFUNDED" && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
                {t("order.payAtCounterHint")}
              </p>
            )}
        </div>

        <Link
          href="/order"
          className="mt-4 block text-center text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          {t("order.backToMenu")}
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
