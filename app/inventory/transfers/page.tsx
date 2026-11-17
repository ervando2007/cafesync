import { getOutletsForUser } from "@/lib/pos";
import { getStockItemOptions, type StockItemOption } from "@/lib/inventory";
import { TransferForm } from "@/app/ui/inventory/transfer-form";
import { requireMenu } from "@/lib/menu-access";

export default async function TransfersPage() {
  const session = await requireMenu("inventory");
  const outlets = await getOutletsForUser(session);

  const outletItems: Record<number, StockItemOption[]> = {};
  await Promise.all(
    outlets.map(async (outlet) => {
      outletItems[outlet.id] = await getStockItemOptions(outlet.id);
    }),
  );

  return <TransferForm outlets={outlets} outletItems={outletItems} />;
}
