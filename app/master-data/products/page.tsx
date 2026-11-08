import { requireRole } from "@/lib/auth-guard";
import { getUnits } from "@/lib/inventory";
import { getOutletsForManagement } from "@/lib/outlets";
import {
  getOutletPricesForProduct,
  getProductCategories,
  getProducts,
  type OutletPriceRow,
} from "@/lib/products";
import { ProductsTable } from "@/app/ui/master-data/products-table";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

export default async function ProductsPage() {
  const session = await requireRole(["ADMIN", "GM"]);
  const { t } = await getT();

  const [products, categories, units, outlets] = await Promise.all([
    getProducts(),
    getProductCategories(),
    getUnits(),
    getOutletsForManagement(session),
  ]);
  const outletCount = outlets.filter((o) => o.status === "ACTIVE").length;

  const outletPricesByProduct: Record<number, OutletPriceRow[]> = {};
  await Promise.all(
    products.map(async (product) => {
      outletPricesByProduct[product.id] = await getOutletPricesForProduct(product.id, "DINE_IN");
    }),
  );

  return (
    <>
      <PageHeader eyebrow={t("nav.masterData")} title={t("nav.products")} />

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <ProductsTable
          products={products}
          categories={categories}
          units={units}
          outletPricesByProduct={outletPricesByProduct}
          outletCount={outletCount}
        />
      </div>
    </>
  );
}
