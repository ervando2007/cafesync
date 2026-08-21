"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusIcon, SearchIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { ProductFormModal } from "@/app/ui/master-data/product-form-modal";
import { OutletPricingModal } from "@/app/ui/master-data/outlet-pricing-modal";
import { setProductStatus } from "@/app/master-data/actions";
import type { OutletPriceRow, ProductCategoryOption, ProductRecord } from "@/lib/products";
import type { UnitOption } from "@/lib/inventory";

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  BEVERAGE: "Beverage",
  FOOD: "Food",
  MERCHANDISE: "Merchandise",
  SERVICE: "Service",
};

export function ProductsTable({
  products,
  categories,
  units,
  outletPricesByProduct,
  outletCount,
}: {
  products: ProductRecord[];
  categories: ProductCategoryOption[];
  units: UnitOption[];
  outletPricesByProduct: Record<number, OutletPriceRow[]>;
  outletCount: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [modalProduct, setModalProduct] = useState<ProductRecord | "new" | null>(null);
  const [pricingProduct, setPricingProduct] = useState<ProductRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryNames = useMemo(
    () => Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean))),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "ALL" || p.categoryName === categoryFilter;
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  function toggleStatus(product: ProductRecord) {
    const nextStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setProductStatus({ id: product.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name / SKU..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          {categoryNames.map((c) => (
            <option key={c} value={c as string}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => setModalProduct("new")}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Outlets</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                  No products match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    product.status === "INACTIVE" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{product.categoryName ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {PRODUCT_TYPE_LABEL[product.productType] ?? product.productType}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{product.sku}</td>
                  <td className="px-5 py-3">
                    {product.outletCount === 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        Not set up
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {product.outletCount}/{outletCount} outlets
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {product.status === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setPricingProduct(product)}
                        className="text-xs font-medium text-amber-700 hover:text-amber-800"
                      >
                        Outlet Pricing
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProduct(product)}
                        className="text-gray-400 hover:text-amber-700"
                        aria-label={`Edit ${product.name}`}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(product)}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                      >
                        {product.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalProduct && (
        <ProductFormModal
          mode={modalProduct === "new" ? "create" : "edit"}
          product={modalProduct === "new" ? undefined : modalProduct}
          categories={categories}
          units={units}
          onClose={() => setModalProduct(null)}
        />
      )}

      {pricingProduct && (
        <OutletPricingModal
          productId={pricingProduct.id}
          productName={pricingProduct.name}
          outletPrices={outletPricesByProduct[pricingProduct.id] ?? []}
          onClose={() => setPricingProduct(null)}
        />
      )}
    </div>
  );
}
