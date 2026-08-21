"use client";

import { useState, useTransition } from "react";
import { PosHeader } from "@/app/ui/pos/header";
import { ProductGrid } from "@/app/ui/pos/product-grid";
import { CartPanel } from "@/app/ui/pos/cart-panel";
import { ReceiptModal } from "@/app/ui/pos/receipt-modal";
import {
  cancelHeldOrder,
  loadHeldOrder,
  refreshHeldOrders,
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

export interface OutletBundle {
  catalog: CatalogProduct[];
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
  const [data, setData] = useState(outletData);
  const [outletId, setOutletId] = useState<number>(outlets[0]?.id ?? 0);
  const [orderType, setOrderType] = useState<OrderChannel>("DINE_IN_STAFF");
  const [tableId, setTableId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [holdOrderId, setHoldOrderId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<OrderDetail | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const bundle = data[outletId] ?? { catalog: [], tables: [], heldOrders: [] };

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const taxTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty * line.taxRate, 0);
  const discountTotal = Math.max(0, Math.min(Number(discountInput) || 0, subtotal));
  const grandTotal = subtotal - discountTotal + taxTotal;

  function flash(type: "error" | "info", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  }

  function resetOrderState() {
    setCart([]);
    setDiscountInput("0");
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

  function addToCart(product: CatalogProduct) {
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
    const held = await refreshHeldOrders(outletId);
    setData((prev) => ({ ...prev, [outletId]: { ...prev[outletId], heldOrders: held } }));
  }

  function doSubmit(mode: "hold" | "pay", clearAfter: boolean) {
    if (cart.length === 0) {
      flash("error", "Add at least one item first.");
      return;
    }
    if (mode === "pay" && !paymentMethod) {
      flash("error", "Select a payment method.");
      return;
    }
    if (orderType === "DINE_IN_STAFF" && !tableId) {
      flash("error", "Select a table for dine-in orders.");
      return;
    }

    startTransition(async () => {
      const result = await submitOrder({
        outletId,
        tableId: orderType === "DINE_IN_STAFF" ? tableId : null,
        channel: orderType,
        items: cart.map((line) => ({ productId: line.productId, qty: line.qty })),
        discountTotal,
        mode,
        paymentMethod: mode === "pay" ? (paymentMethod ?? undefined) : undefined,
        holdOrderId: holdOrderId ?? undefined,
      });

      if (!result.ok) {
        flash("error", result.message);
        return;
      }

      await refreshHeld();

      if (mode === "pay") {
        setReceipt(result.order);
        resetOrderState();
      } else if (clearAfter) {
        flash("info", `Order held as ${result.order.orderNo}.`);
        resetOrderState();
      } else {
        setHoldOrderId(result.order.id);
        flash("info", `Saved as ${result.order.orderNo}.`);
      }
    });
  }

  function handleResumeHeld(orderId: number) {
    startTransition(async () => {
      const order = await loadHeldOrder(orderId);
      if (!order) {
        flash("error", "Could not load that order.");
        return;
      }
      const lines: CartLine[] = order.items.map((item) => {
        const product = bundle.catalog.find((p) => p.productId === item.productId);
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
      setDiscountInput(String(order.discountTotal));
      setTableId(order.tableId);
      setGuestName(order.guestName);
      setOrderType(order.channel as OrderChannel);
      setHoldOrderId(order.id);
      setPaymentMethod(null);
      flash(
        "info",
        order.guestName ? `Resumed ${order.orderNo} — ${order.guestName}.` : `Resumed ${order.orderNo}.`,
      );
    });
  }

  function handleCancelHeld(orderId: number) {
    startTransition(async () => {
      const result = await cancelHeldOrder(orderId, outletId);
      if (!result.ok) {
        flash("error", "Could not cancel that order.");
        return;
      }
      if (holdOrderId === orderId) resetOrderState();
      await refreshHeld();
    });
  }

  const orderLabel = holdOrderId
    ? guestName
      ? `Editing order — ${guestName}`
      : "Editing held order"
    : cart.length > 0
      ? "New Order"
      : "No active order";

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
          <ProductGrid catalog={bundle.catalog} onAddToCart={addToCart} />
          <CartPanel
            orderLabel={orderLabel}
            cart={cart}
            onIncrement={incrementLine}
            onDecrement={decrementLine}
            onRemove={removeLine}
            onClear={resetOrderState}
            discountInput={discountInput}
            onDiscountChange={setDiscountInput}
            subtotal={subtotal}
            discountTotal={discountTotal}
            taxTotal={taxTotal}
            grandTotal={grandTotal}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            isSubmitting={isPending}
            onSave={() => doSubmit("hold", false)}
            onHold={() => doSubmit("hold", true)}
            onPay={() => doSubmit("pay", true)}
            heldOrders={bundle.heldOrders}
            onResumeHeld={handleResumeHeld}
            onCancelHeld={handleCancelHeld}
          />
        </div>
      </div>

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
