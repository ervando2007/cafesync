"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { ProductCategoryManagerModal } from "@/app/ui/master-data/product-category-manager-modal";
import { ProductImageUploader } from "@/app/ui/master-data/product-image-uploader";
import { createProduct, updateProduct } from "@/app/master-data/actions";
import type { ProductCategoryOption, ProductRecord } from "@/lib/products";
import type { UnitOption } from "@/lib/inventory";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function productTypes(t: TranslateFn): { value: string; label: string }[] {
  return [
    { value: "BEVERAGE", label: t("masterData.typeBeverage") },
    { value: "FOOD", label: t("masterData.typeFood") },
    { value: "MERCHANDISE", label: t("masterData.typeMerchandise") },
    { value: "SERVICE", label: t("masterData.typeService") },
  ];
}

export function ProductFormModal({
  mode,
  product,
  categories,
  units,
  onClose,
}: {
  mode: "create" | "edit";
  product?: ProductRecord;
  categories: ProductCategoryOption[];
  units: UnitOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const PRODUCT_TYPES = productTypes(t);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? 0);
  const [productType, setProductType] = useState<string>(product?.productType ?? "BEVERAGE");
  const [baseUnitId, setBaseUnitId] = useState(product?.baseUnitId ?? units[0]?.id ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectableCategories = useMemo(() => {
    const active = categories.filter((c) => c.status === "ACTIVE");
    if (product?.categoryId && !active.some((c) => c.id === product.categoryId)) {
      const current = categories.find((c) => c.id === product.categoryId);
      if (current) return [current, ...active];
    }
    return active;
  }, [categories, product]);

  function handleSubmit() {
    setError(null);
    const input = {
      sku,
      name,
      description,
      categoryId: categoryId || null,
      productType,
      baseUnitId: baseUnitId || null,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct(input)
          : await updateProduct({ ...input, id: product!.id });

      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? t("masterData.addProduct") : t("masterData.editProductTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("common.close")}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {mode === "edit" && product ? (
            <ProductImageUploader productId={product.id} imageUrl={product.imageUrl} />
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-400">
              {t("masterData.saveProductFirstHint")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t("masterData.productSkuPlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("masterData.colType")}</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {PRODUCT_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.productName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("masterData.productNamePlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("masterData.descriptionPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">{t("inventory.category")}</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(true)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  {t("common.manage")}
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value={0}>{t("masterData.noCategory")}</option>
                {selectableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("masterData.baseUnit")}</label>
              <select
                value={baseUnitId}
                onChange={(e) => setBaseUnitId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : t("masterData.saveProduct")}
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <ProductCategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
