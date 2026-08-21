import { getActiveOutlets, getMenuCatalog, getTablesForOutlet } from "@/lib/customer-menu";
import { CustomerMenu, type OutletBundle } from "@/app/ui/order/customer-menu";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; table?: string }>;
}) {
  const params = await searchParams;
  const outlets = await getActiveOutlets();

  const outletData: Record<number, OutletBundle> = {};
  await Promise.all(
    outlets.map(async (outlet) => {
      const [catalog, tables] = await Promise.all([
        getMenuCatalog(outlet.id),
        getTablesForOutlet(outlet.id),
      ]);
      outletData[outlet.id] = { catalog, tables };
    }),
  );

  const matchedOutlet = params.outlet
    ? (outlets.find((o) => o.code === params.outlet) ?? null)
    : null;
  const initialOutletId = matchedOutlet?.id ?? null;

  const initialTableId =
    matchedOutlet && params.table
      ? (outletData[matchedOutlet.id]?.tables.find((t) => t.code === params.table)?.id ?? null)
      : null;

  return (
    <CustomerMenu
      outlets={outlets}
      outletData={outletData}
      initialOutletId={initialOutletId}
      initialTableId={initialTableId}
    />
  );
}
