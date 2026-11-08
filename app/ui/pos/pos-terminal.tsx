"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/app/i18n-provider";
import { PosHeader } from "@/app/ui/pos/header";
import { ProductGrid } from "@/app/ui/pos/product-grid";
import { CartPanel } from "@/app/ui/pos/cart-panel";
import { ReceiptModal } from "@/app/ui/pos/receipt-modal";
import {
  loadHeldOrder,
  refreshCatalog,
  refreshHeldOrders,
  refreshTables,
  releaseTable,
  submitOrder,
  type OrderChannel,
  type PaymentMethod,
} from "@/app/pos/actions";
import type {
  CatalogProduct,
  DiningTableOption,
  HeldOrderSummary,
  OrderDetail,
  OutletOption,
} from "@/lib/pos";
import { pricingChannelFor, type PricingChannel } from "@/lib/pricing-channel";

export interface OutletBundle {
  catalogByChannel: Record<PricingChannel, CatalogProduct[]>;
  tables: DiningTableOption[];
  heldOrders: HeldOrderSummary[];
}

export interface CartLine {
  productId: number;
  name: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  productType: string;
  imageUrl: string | null;
}

export function PosTerminal({
  outlets,
  outletData,
  userName,
  userRole,
}: {
  outlets: OutletOption[];
  outletData: Record<number, OutletBundle>;
  userName: string;
  userRole: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState(outletData);
  const [outletId, setOutletId] = useState<number>(outlets[0]?.id ?? 0);
  const [orderType, setOrderType] = useState<OrderChannel>("DINE_IN_STAFF");
  const [tableId, setTableId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [holdOrderId, setHoldOrderId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<OrderDetail | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const bundle = data[outletId] ?? {
    catalogByChannel: { DINE_IN: [], TAKEAWAY: [], GRABFOOD: [] },
    tables: [],
    heldOrders: [],
  };
  const pricingChannel = pricingChannelFor(orderType);
  const catalog = bundle.catalogByChannel[pricingChannel] ?? [];

  // PB1 (11%) and service charge (3.5%) are flat rates on the gross subtotal —
  // must match app/pos/actions.ts's PB1_RATE/SERVICE_CHARGE_RATE exactly.
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const discountTotal = subtotal * (discountPercent / 100);
  const taxTotal = subtotal * 0.11;
  const serviceChargeTotal = subtotal * 0.035;
  const grandTotal = subtotal - discountTotal + serviceChargeTotal + taxTotal;

  function flash(type: "error" | "info", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  }

  function resetOrderState() {
    setCart([]);
    setDiscountPercent(0);
    setPaymentMethod(null);
    setHoldOrderId(null);
    setGuestName(null);
  }

  function handleOutletChange(id: number) {
    setOutletId(id);
    setTableId(null);
    resetOrderState();
  }

  function handleOrderTypeChange(type: OrderChannel) {
    setOrderType(type);
    if (type !== "DINE_IN_STAFF") setTableId(null);
  }

  /** Rejects a qty the current stock can't make (null portionsLeft = no recipe, unlimited). */
  function exceedsStock(productId: number, nextQty: number): boolean {
    const product = catalog.find((p) => p.productId === productId);
    if (!product || product.portionsLeft == null) return false;
    if (nextQty <= product.portionsLeft) return false;
    flash(
      "error",
      product.portionsLeft === 0
        ? t("pos.productOutOfStock", { name: product.name })
        : t("pos.onlyPortionsLeft", { name: product.name, count: product.portionsLeft }),
    );
    return true;
  }

  function addToCart(product: CatalogProduct) {
    const currentQty = cart.find((line) => line.productId === product.productId)?.qty ?? 0;
    if (product.stockStatus === "OUT" || exceedsStock(product.productId, currentQty + 1)) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.productId ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.productId,
          name: product.name,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate,
          qty: 1,
          productType: product.productType,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }

  function incrementLine(productId: number) {
    const currentQty = cart.find((line) => line.productId === productId)?.qty ?? 0;
    if (exceedsStock(productId, currentQty + 1)) return;
    setCart((prev) =>
      prev.map((line) => (line.productId === productId ? { ...line, qty: line.qty + 1 } : line)),
    );
  }

  function decrementLine(productId: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, qty: line.qty - 1 } : line))
        .filter((line) => line.qty > 0),
    );
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  }

  async function refreshHeld() {
    const [held, catalogByChannel, tables] = await Promise.all([
      refreshHeldOrders(outletId),
      refreshCatalog(outletId),
      refreshTables(outletId),
    ]);
    setData((prev) => ({
      ...prev,
      [outletId]: {
        ...prev[outletId],
        heldOrders: held,
        catalogByChannel: catalogByChannel ?? prev[outletId].catalogByChannel,
        tables: tables ?? prev[outletId].tables,
      },
    }));
  }

  function handleReleaseTable(id: number) {
    startTransition(async () => {
      const result = await releaseTable(outletId, id);
      if (!result.ok) {
        flash("error", result.message);
        return;
      }
      setData((prev) => ({ ...prev, [outletId]: { ...prev[outletId], tables: result.tables } }));
      const name = result.tables.find((tbl) => tbl.id === id)?.name ?? "";
      flash("info", t("pos.tableReleased", { table: name }));
    });
  }

  function doSubmit(mode: "hold" | "pay") {
    if (cart.length === 0) {
      flash("error", t("pos.addAtLeastOneItem"));
      return;
    }
    if (mode === "pay" && !paymentMethod) {
      flash("error", t("pos.selectPaymentMethod"));
      return;
    }
    if (orderType === "DINE_IN_STAFF" && !tableId) {
      flash("error", t("pos.selectTableForDineIn"));
      return;
    }

    startTransition(async () => {
      const result = await submitOrder({
        outletId,
        tableId: orderType === "DINE_IN_STAFF" ? tableId : null,
        channel: orderType,
        items: cart.map((line) => ({ productId: line.productId, qty: line.qty })),
        discountPercent,
        mode,
        paymentMethod: mode === "pay" ? (paymentMethod ?? undefined) : undefined,
        holdOrderId: holdOrderId ?? undefined,
      });

      if (!result.ok) {
        flash("error", result.message);
        // A stock refusal means our badges are stale (another till sold the
        // last portions) — pull fresh availability so the grid matches.
        await refreshHeld();
        return;
      }

      await refreshHeld();

      if (mode === "pay") {
        setReceipt(result.order);
        resetOrderState();
      } else {
        flash("info", t("pos.orderHeldAs", { orderNo: result.order.orderNo }));
        resetOrderState();
      }
    });
  }

  function handleResumeHeld(orderId: number) {
    startTransition(async () => {
      const order = await loadHeldOrder(orderId);
      if (!order) {
        flash("error", t("pos.couldNotLoadOrder"));
        return;
      }
      const heldCatalog = bundle.catalogByChannel[pricingChannelFor(order.channel)] ?? [];
      const lines: CartLine[] = order.items.map((item) => {
        const product = heldCatalog.find((p) => p.productId === item.productId);
        return {
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          taxRate: product?.taxRate ?? 0,
          qty: item.qty,
          productType: product?.productType ?? "FOOD",
          imageUrl: product?.imageUrl ?? null,
        };
      });
      setCart(lines);
      setDiscountPercent(order.discountPercent ?? 0);
      setTableId(order.tableId);
      setGuestName(order.guestName);
      setOrderType(order.channel as OrderChannel);
      setHoldOrderId(order.id);
      setPaymentMethod(null);
      flash(
        "info",
        order.guestName
          ? t("pos.resumedWithGuest", { orderNo: order.orderNo, guestName: order.guestName })
          : t("pos.resumed", { orderNo: order.orderNo }),
      );
    });
  }

  function handleOrderVoided() {
    flash("info", t("pos.voidedOrder"));
    resetOrderState();
    refreshHeld();
  }

  function handleHeldOrderVoided(orderId: number) {
    flash("info", t("pos.voidedOrder"));
    if (holdOrderId === orderId) resetOrderState();
    refreshHeld();
  }

  const orderLabel = holdOrderId
    ? guestName
      ? t("pos.editingOrderGuest", { guestName })
      : t("pos.editingHeldOrder")
    : cart.length > 0
      ? t("pos.newOrder")
      : t("pos.noActiveOrder");

  return (
    <>
      <div className="flex h-full flex-col print:hidden">
        <PosHeader
          outlets={outlets}
          selectedOutletId={outletId}
          onOutletChange={handleOutletChange}
          orderType={orderType}
          onOrderTypeChange={handleOrderTypeChange}
          tables={bundle.tables}
          tableId={tableId}
          onTableChange={setTableId}
          onReleaseTable={handleReleaseTable}
          releasing={isPending}
          userName={userName}
          userRole={userRole}
        />

        {message && (
          <div
            className={`px-6 py-2 text-center text-sm font-medium ${
              message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <ProductGrid catalog={catalog} onAddToCart={addToCart} />
          <CartPanel
            outletId={outletId}
            holdOrderId={holdOrderId}
            orderLabel={orderLabel}
            cart={cart}
            onIncrement={incrementLine}
            onDecrement={decrementLine}
            onRemove={removeLine}
            discountPercent={discountPercent}
            onDiscountPercentChange={setDiscountPercent}
            subtotal={subtotal}
            discountTotal={discountTotal}
            taxTotal={taxTotal}
            serviceChargeTotal={serviceChargeTotal}
            grandTotal={grandTotal}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            isSubmitting={isPending}
            onHold={() => doSubmit("hold")}
            onPay={() => doSubmit("pay")}
            onVoidCurrentOrder={handleOrderVoided}
            onVoidHeldOrder={handleHeldOrderVoided}
            heldOrders={bundle.heldOrders}
            onResumeHeld={handleResumeHeld}
          />
        </div>
      </div>

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
