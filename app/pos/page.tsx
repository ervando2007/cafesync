import { requireRole } from "@/lib/auth-guard";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getDiningTables, getHeldOrders, getOutletsForUser, getPosCatalog } from "@/lib/pos";
import { PosTerminal, type OutletBundle } from "@/app/ui/pos/pos-terminal";

export default async function PosPage() {
  const session = await requireRole(["ADMIN", "GM", "MANAGER", "CASHIER"]);

  const outlets = await getOutletsForUser(session);
  const outletData: Record<number, OutletBundle> = {};

  await Promise.all(
    outlets.map(async (outlet) => {
      const [catalog, tables, heldOrders] = await Promise.all([
        getPosCatalog(outlet.id),
        getDiningTables(outlet.id),
        getHeldOrders(outlet.id),
      ]);
      outletData[outlet.id] = { catalog, tables, heldOrders };
    }),
  );

  const { userName, userRole } = resolveDisplayIdentity(session);

  return (
    <PosTerminal
      outlets={outlets}
      outletData={outletData}
      userName={userName}
      userRole={userRole}
    />
  );
}
