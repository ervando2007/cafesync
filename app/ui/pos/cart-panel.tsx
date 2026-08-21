"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { UtensilsIcon } from "@/app/ui/dashboard/icons";
import {
  BookmarkIcon,
  CardIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  QrCodeIcon,
  SplitIcon,
  TrashIcon,
  XIcon,
} from "@/app/ui/pos/icons";
import { WalletIcon } from "@/app/ui/dashboard/icons";
import type { PaymentMethod } from "@/app/pos/actions";
import type { HeldOrderSummary } from "@/lib/pos";
import type { CartLine } from "@/app/ui/pos/pos-terminal";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function roundUpTo(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function paymentOptions(t: TranslateFn): { value: PaymentMethod; label: string; icon: typeof CardIcon }[] {
  return [
    { value: "CASH", label: t("pos.cash"), icon: WalletIcon },
    { value: "CARD", label: t("pos.card"), icon: CardIcon },
    { value: "QRIS", label: t("pos.qris"), icon: QrCodeIcon },
    { value: "BANK_TRANSFER", label: t("pos.eWallet"), icon: WalletIcon },
    { value: "OTHER", label: t("pos.splitPay"), icon: SplitIcon },
  ];
}

export function CartPanel({
  orderLabel,
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  discountInput,
  onDiscountChange,
  subtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  paymentMethod,
  onPaymentMethodChange,
  isSubmitting,
  onSave,
  onHold,
  onPay,
  heldOrders,
  onResumeHeld,
  onCancelHeld,
}: {
  orderLabel: string;
  cart: CartLine[];
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
  discountInput: string;
  onDiscountChange: (value: string) => void;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  isSubmitting: boolean;
  onSave: () => void;
  onHold: () => void;
  onPay: () => void;
  heldOrders: HeldOrderSummary[];
  onResumeHeld: (orderId: number) => void;
  onCancelHeld: (orderId: number) => void;
}) {
  const { t } = useI18n();
  const PAYMENT_OPTIONS = paymentOptions(t);
  const [cashReceived, setCashReceived] = useState("");
  const [showHeld, setShowHeld] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);

  function selectPaymentMethod(method: PaymentMethod) {
    setCashReceived("");
    onPaymentMethodChange(method);
  }

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "F9") {
        e.preventDefault();
        onPay();
      } else if (e.key === "F10") {
        e.preventDefault();
        onSave();
      } else if (e.key === "F11") {
        e.preventDefault();
        onHold();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onPay, onSave, onHold]);

  const received = Number(cashReceived) || 0;
  const change = received - grandTotal;
  const quickCash =
    grandTotal > 0
      ? Array.from(new Set([roundUpTo(grandTotal, 10000), roundUpTo(grandTotal, 50000), roundUpTo(grandTotal, 100000)]))
      : [];

  return (
    <div className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{orderLabel}</p>
          <button
            type="button"
            onClick={() => setShowHeld((v) => !v)}
            className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            <ClockIcon className="h-3.5 w-3.5" />
            {t("pos.heldOrdersCount", { count: heldOrders.length })}
          </button>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={cart.length === 0}
          className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
        >
          {t("pos.clearOrder")}
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {showHeld && (
        <div className="max-h-48 overflow-y-auto border-b border-gray-100 bg-gray-50 p-3">
          {heldOrders.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-gray-400">{t("pos.noHeldOrdersPeriod")}</p>
          ) : (
            <ul className="space-y-1.5">
              {heldOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{order.orderNo}</p>
                    <p className="text-gray-400">
                      {t("pos.itemsCount", { count: order.itemCount })} · {formatRp(order.grandTotal)}
                    </p>
                    {(order.guestName || order.tableName) && (
                      <p className="font-medium text-amber-700">
                        {order.guestName ?? order.tableName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResumeHeld(order.id)}
                      className="font-medium text-amber-700 hover:text-amber-800"
                    >
                      {t("pos.resume")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelHeld(order.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {cart.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-400">
            {t("pos.tapMenuItemHint")}
          </p>
        ) : (
          <ul className="space-y-4">
            {cart.map((line) => {
              const Icon = line.productType === "BEVERAGE" ? CoffeeCupIcon : UtensilsIcon;
              return (
                <li key={line.productId} className="flex items-start gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50 text-amber-700">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{line.name}</p>
                      <p className="shrink-0 text-sm font-semibold text-gray-900">
                        {formatRp(line.unitPrice * line.qty)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {line.qty} x {formatRp(line.unitPrice)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDecrement(line.productId)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-semibold text-gray-800">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(line.productId)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(line.productId)}
                        className="ml-auto text-gray-300 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 border-t border-gray-100 px-5 py-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{t("pos.subtotal")}</span>
          <span className="text-gray-900">{formatRp(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            {t("pos.discount")}{" "}
            <button
              type="button"
              onClick={() => setShowDiscount((v) => !v)}
              className="ml-1 text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              {showDiscount ? "" : t("pos.editLabel")}
            </button>
          </span>
          {showDiscount ? (
            <input
              value={discountInput}
              onChange={(e) => onDiscountChange(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="w-28 rounded-md border border-gray-200 px-2 py-0.5 text-right text-sm focus:border-amber-500 focus:outline-none"
            />
          ) : (
            <span className="text-gray-900">{formatRp(discountTotal)}</span>
          )}
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>{t("pos.tax")}</span>
          <span className="text-gray-900">{formatRp(taxTotal)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-gray-100 pt-2">
          <span className="text-base font-semibold text-gray-900">{t("pos.total")}</span>
          <span className="text-xl font-bold text-amber-700">{formatRp(grandTotal)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5">
        <button
          type="button"
          onClick={onPay}
          disabled={cart.length === 0 || isSubmitting}
          className="rounded-xl bg-amber-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("pos.pay")}
          <span className="block text-[10px] font-normal text-amber-100">F9</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={cart.length === 0 || isSubmitting}
          className="rounded-xl border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("pos.saveOrder")}
          <span className="block text-[10px] font-normal text-gray-400">F10</span>
        </button>
        <button
          type="button"
          onClick={onHold}
          disabled={cart.length === 0 || isSubmitting}
          className="flex flex-col items-center rounded-xl border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center gap-1">
            <BookmarkIcon className="h-3.5 w-3.5" /> {t("pos.hold")}
          </span>
          <span className="block text-[10px] font-normal text-gray-400">F11</span>
        </button>
      </div>

      {paymentMethod === "CASH" && (
        <div className="px-5 pt-3">
          <p className="text-xs text-gray-500">{t("pos.quickCashLabel")}</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {quickCash.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setCashReceived(String(amount))}
                className="rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {formatRp(amount)}
              </button>
            ))}
            <input
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={t("pos.custom")}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-center text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
          {received > 0 && (
            <p className={`mt-1.5 text-xs font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {change >= 0
                ? t("pos.change", { amount: formatRp(change) })
                : t("pos.shortBy", { amount: formatRp(-change) })}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 p-5">
        {PAYMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = paymentMethod === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectPaymentMethod(option.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-medium transition ${
                active
                  ? "border-amber-700 bg-amber-50 text-amber-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
