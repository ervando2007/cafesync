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

export default async function ProductsPage() {
  const session = await requireRole(["ADMIN", "GM"]);

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
      outletPricesByProduct[product.id] = await getOutletPricesForProduct(product.id);
    }),
  );

  return (
    <div className="p-6 sm:p-8">
      <div>
        <p className="text-xs font-medium text-gray-400">Master Data</p>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      </div>

      <div className="mt-6">
        <ProductsTable
          products={products}
          categories={categories}
          units={units}
          outletPricesByProduct={outletPricesByProduct}
          outletCount={outletCount}
        />
      </div>
    </div>
  );
}
