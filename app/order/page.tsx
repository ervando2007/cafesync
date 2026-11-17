import { getActiveOutlets, getMenuCatalog, getTablesForOutlet } from "@/lib/customer-menu";
import { CustomerMenu, type OutletBundle } from "@/app/ui/order/customer-menu";
import { ScanQrNotice } from "@/app/ui/order/scan-qr-notice";

// Customer self-ordering only ever needs these two price lists (never GRABFOOD —
// that's a delivery-platform order, not something placed through this page).
const CUSTOMER_CHANNELS = ["DINE_IN", "TAKEAWAY"] as const;

/**
 * Reached only through a printed QR: ?outlet=CODE (outlet QR) or
 * ?outlet=CODE&table=CODE (table sticker). The outlet is fixed; there is no
 * outlet picker, so a link without a valid outlet asks the guest to scan.
 */
export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; table?: string }>;
}) {
  const params = await searchParams;
  const outlets = await getActiveOutlets();
  const outlet = params.outlet ? outlets.find((o) => o.code === params.outlet) : undefined;
  if (!outlet) return <ScanQrNotice />;

  const [catalogsByChannel, tables] = await Promise.all([
    Promise.all(CUSTOMER_CHANNELS.map((channel) => getMenuCatalog(outlet.id, channel))),
    getTablesForOutlet(outlet.id),
  ]);
  const bundle: OutletBundle = {
    catalogByChannel: Object.fromEntries(
      CUSTOMER_CHANNELS.map((channel, i) => [channel, catalogsByChannel[i]]),
    ) as OutletBundle["catalogByChannel"],
    tables,
  };

  const lockedTable = params.table
    ? tables.find((t) => t.code === params.table && t.status !== "INACTIVE")
    : undefined;

  const query = new URLSearchParams({ outlet: outlet.code });
  if (lockedTable) query.set("table", lockedTable.code);

  return (
    <CustomerMenu
      outlet={outlet}
      bundle={bundle}
      lockedTableId={lockedTable?.id ?? null}
      menuHref={`/order?${query.toString()}`}
    />
  );
}
