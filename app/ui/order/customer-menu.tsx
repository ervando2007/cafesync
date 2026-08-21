"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@/app/ui/pos/icons";
import { OrderTopNav } from "@/app/ui/order/topnav";
import { WelcomeBanner } from "@/app/ui/order/welcome-banner";
import { MenuSidebar } from "@/app/ui/order/menu-sidebar";
import { ProductGrid } from "@/app/ui/order/product-grid";
import { OrderCartPanel } from "@/app/ui/order/cart-panel";
import { SelectModal } from "@/app/ui/order/select-modal";
import { SiteFooter } from "@/app/ui/order/site-footer";
import { placeOrder, type CustomerOrderType } from "@/app/order/actions";
import type { MenuItem, PublicOutlet, PublicTable } from "@/lib/customer-menu";

export interface CartLine {
  productId: number;
  name: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  productType: string;
  imageUrl: string | null;
}

export interface OutletBundle {
  catalog: MenuItem[];
  tables: PublicTable[];
}

const EMPTY_CATALOG: MenuItem[] = [];
const EMPTY_TABLES: PublicTable[] = [];

export function CustomerMenu({
  outlets,
  outletData,
  initialOutletId,
  initialTableId,
}: {
  outlets: PublicOutlet[];
  outletData: Record<number, OutletBundle>;
  initialOutletId: number | null;
  initialTableId: number | null;
}) {
  const [outletId, setOutletId] = useState<number | null>(initialOutletId ?? outlets[0]?.id ?? null);
  const [orderType, setOrderType] = useState<CustomerOrderType>("DINE_IN_QR");
  const [tableId, setTableId] = useState<number | null>(initialTableId);
  const [guestName, setGuestName] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Menu");
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrderNo, setConfirmedOrderNo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bundle = outletId !== null ? outletData[outletId] : undefined;
  const catalog = bundle?.catalog ?? EMPTY_CATALOG;
  const tables = bundle?.tables ?? EMPTY_TABLES;

  const outlet = outlets.find((o) => o.id === outletId) ?? null;
  const table = tables.find((t) => t.id === tableId) ?? null;

  const categories = useMemo(() => {
    const names = Array.from(new Set(catalog.map((p) => p.categoryName)));
    return ["All Menu", ...names];
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesCategory = category === "All Menu" || item.categoryName === category;
      const matchesSearch = !q || item.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [catalog, category, search]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const taxTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty * line.taxRate, 0);
  const grandTotal = subtotal + taxTotal;

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === item.productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === item.productId ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: item.name,
          unitPrice: item.sellingPrice,
          taxRate: item.taxRate,
          qty: 1,
          productType: item.productType,
          imageUrl: item.imageUrl,
        },
      ];
    });
  }

  function increment(productId: number) {
    setCart((prev) =>
      prev.map((line) => (line.productId === productId ? { ...line, qty: line.qty + 1 } : line)),
    );
  }

  function decrement(productId: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, qty: line.qty - 1 } : line))
        .filter((line) => line.qty > 0),
    );
  }

  function remove(productId: number) {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  }

  function selectOutlet(id: number) {
    setOutletId(id);
    setTableId(null);
    setCart([]);
    setShowOutletModal(false);
  }

  function selectTable(id: number) {
    setTableId(id);
    setShowTableModal(false);
  }

  function handleOrderTypeChange(type: CustomerOrderType) {
    setOrderType(type);
    setError(null);
  }

  function handleCheckout() {
    setError(null);
    if (!outletId) {
      setError("Please select an outlet first.");
      return;
    }
    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (orderType === "DINE_IN_QR" && !tableId) {
      setShowTableModal(true);
      return;
    }
    if (orderType === "TAKEAWAY" && !guestName.trim()) {
      setError("Please enter your name.");
      return;
    }

    startTransition(async () => {
      const items = cart.map((line) => ({ productId: line.productId, qty: line.qty }));
      const result = await placeOrder(
        orderType === "DINE_IN_QR"
          ? { outletId, orderType, tableId: tableId as number, items }
          : { outletId, orderType, guestName, items },
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmedOrderNo(result.orderNo);
      setCart([]);
    });
  }

  if (confirmedOrderNo) {
    const whoText =
      orderType === "DINE_IN_QR"
        ? table
          ? `to ${table.name} at ${outlet?.name}`
          : `to ${outlet?.name}`
        : `for ${guestName.trim()} at ${outlet?.name}`;

    return (
      <div className="flex min-h-screen flex-col bg-[#f9f8f6]">
        <OrderTopNav />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-8 w-8" />
            </span>
            <p className="mt-4 text-lg font-bold text-gray-900">Order Placed!</p>
            <p className="mt-1 text-sm text-gray-500">
              Your order{" "}
              <span className="font-semibold text-gray-800">{confirmedOrderNo}</span> has been
              sent {whoText}. Please pay at the counter when your order arrives.
            </p>
            <div className="mt-6 space-y-2.5">
              <Link
                href={`/order/track/${confirmedOrderNo}`}
                className="block w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Track Order Status
              </Link>
              <button
                type="button"
                onClick={() => setConfirmedOrderNo(null)}
                className="block w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Order More
              </button>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f8f6]">
      <OrderTopNav />

      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-6 py-6">
        <WelcomeBanner outletName={outlet?.name ?? null} onChangeOutlet={() => setShowOutletModal(true)} />

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_340px]">
          <MenuSidebar
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
            search={search}
            onSearchChange={setSearch}
          />

          <ProductGrid title="All Menu" items={filtered} onAdd={addToCart} />

          <OrderCartPanel
            orderType={orderType}
            onOrderTypeChange={handleOrderTypeChange}
            tableLabel={table ? table.name : null}
            onChangeTable={() => setShowTableModal(true)}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            cart={cart}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={remove}
            subtotal={subtotal}
            taxTotal={taxTotal}
            grandTotal={grandTotal}
            onCheckout={handleCheckout}
            isSubmitting={isPending}
            canCheckout={cart.length > 0 && outletId !== null}
          />
        </div>
      </main>

      <SiteFooter />

      {showOutletModal && (
        <SelectModal
          title="Select Outlet"
          options={outlets.map((o) => ({ id: o.id, label: o.name, sublabel: o.address ?? undefined }))}
          onSelect={selectOutlet}
          onClose={() => setShowOutletModal(false)}
        />
      )}

      {showTableModal && (
        <SelectModal
          title="Select Your Table"
          options={tables.map((t) => ({
            id: t.id,
            label: t.name,
            sublabel: t.status !== "AVAILABLE" ? t.status : undefined,
            disabled: t.status === "INACTIVE",
          }))}
          onSelect={selectTable}
          onClose={() => setShowTableModal(false)}
        />
      )}
    </div>
  );
}
