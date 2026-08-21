"use client";

import Image from "next/image";
import { CoffeeCupIcon, ShieldCheckIcon } from "@/app/ui/icons";
import { UtensilsIcon } from "@/app/ui/dashboard/icons";
import { MinusIcon, PlusIcon, QrCodeIcon, TrashIcon } from "@/app/ui/pos/icons";
import { ShoppingBagIcon, UserIcon } from "@/app/ui/order/icons";
import type { CustomerOrderType } from "@/app/order/actions";
import type { CartLine } from "@/app/ui/order/customer-menu";

function formatRp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

const ORDER_TYPES: { value: CustomerOrderType; label: string }[] = [
  { value: "DINE_IN_QR", label: "Dine In" },
  { value: "TAKEAWAY", label: "Take Away" },
];

export function OrderCartPanel({
  orderType,
  onOrderTypeChange,
  tableLabel,
  onChangeTable,
  guestName,
  onGuestNameChange,
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  subtotal,
  taxTotal,
  grandTotal,
  onCheckout,
  isSubmitting,
  canCheckout,
}: {
  orderType: CustomerOrderType;
  onOrderTypeChange: (type: CustomerOrderType) => void;
  tableLabel: string | null;
  onChangeTable: () => void;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  cart: CartLine[];
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onRemove: (productId: number) => void;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  onCheckout: () => void;
  isSubmitting: boolean;
  canCheckout: boolean;
}) {
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="flex h-fit flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <p className="flex items-center gap-2 text-base font-bold text-gray-900">
          <ShoppingBagIcon className="h-5 w-5 text-amber-700" />
          Your Order
        </p>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
          {itemCount}
        </span>
      </div>

      <div className="border-b border-gray-100 p-4">
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onOrderTypeChange(type.value)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                orderType === type.value
                  ? "bg-amber-700 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {orderType === "DINE_IN_QR" ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <QrCodeIcon className="h-4 w-4 text-gray-400" />
              {tableLabel ?? "No table selected"}
            </p>
            <button
              type="button"
              onClick={onChangeTable}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              {tableLabel ? "Change" : "Select Table"}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="guest-name" className="text-xs text-gray-400">
              Your Name
            </label>
            <div className="relative mt-1">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="guest-name"
                value={guestName}
                onChange={(e) => onGuestNameChange(e.target.value)}
                placeholder="Enter your name"
                maxLength={150}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Your cart is empty.</p>
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
                      <button
                        type="button"
                        onClick={() => onRemove(line.productId)}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">{formatRp(line.unitPrice)}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatRp(line.unitPrice * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 border-t border-gray-100 p-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span className="text-gray-900">{formatRp(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Tax</span>
          <span className="text-gray-900">{formatRp(taxTotal)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-gray-100 pt-2">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-amber-700">{formatRp(grandTotal)}</span>
        </div>
      </div>

      <div className="space-y-2.5 p-4 pt-0">
        <button
          type="button"
          onClick={onCheckout}
          disabled={!canCheckout || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Placing order..." : "Proceed to Checkout"}
        </button>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-gray-400">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          Your data is safe and secure
        </p>
      </div>
    </div>
  );
}
