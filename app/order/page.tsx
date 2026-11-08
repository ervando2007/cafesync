import { getActiveOutlets, getMenuCatalog, getTablesForOutlet } from "@/lib/customer-menu";
import { CustomerMenu, type OutletBundle } from "@/app/ui/order/customer-menu";

// Customer self-ordering only ever needs these two price lists (never GRABFOOD —
// that's a delivery-platform order, not something placed through this page).
const CUSTOMER_CHANNELS = ["DINE_IN", "TAKEAWAY"] as const;

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
      const [catalogsByChannel, tables] = await Promise.all([
        Promise.all(CUSTOMER_CHANNELS.map((channel) => getMenuCatalog(outlet.id, channel))),
        getTablesForOutlet(outlet.id),
      ]);
      const catalogByChannel = Object.fromEntries(
        CUSTOMER_CHANNELS.map((channel, i) => [channel, catalogsByChannel[i]]),
      ) as OutletBundle["catalogByChannel"];
      outletData[outlet.id] = { catalogByChannel, tables };
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
