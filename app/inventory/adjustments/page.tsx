import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getStockItemOptions, type StockItemOption } from "@/lib/inventory";
import { AdjustmentForm } from "@/app/ui/inventory/adjustment-form";

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const outletItems: Record<number, StockItemOption[]> = {};
  await Promise.all(
    outlets.map(async (outlet) => {
      outletItems[outlet.id] = await getStockItemOptions(outlet.id);
    }),
  );

  return (
    <AdjustmentForm
      outlets={outlets}
      outletItems={outletItems}
      selectedOutletId={selectedOutletId}
    />
  );
}
