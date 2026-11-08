import { requireRole } from "@/lib/auth-guard";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import {
  getDiningTables,
  getHeldOrders,
  getOutletsForUser,
  getPosCatalog,
  PRICING_CHANNELS,
} from "@/lib/pos";
import { PosTerminal, type OutletBundle } from "@/app/ui/pos/pos-terminal";

export default async function PosPage() {
  const session = await requireRole(["ADMIN", "GM", "MANAGER", "CASHIER"]);

  const outlets = await getOutletsForUser(session);
  const outletData: Record<number, OutletBundle> = {};

  await Promise.all(
    outlets.map(async (outlet) => {
      const [catalogsByChannel, tables, heldOrders] = await Promise.all([
        Promise.all(PRICING_CHANNELS.map((channel) => getPosCatalog(outlet.id, channel))),
        getDiningTables(outlet.id),
        getHeldOrders(outlet.id),
      ]);
      const catalogByChannel = Object.fromEntries(
        PRICING_CHANNELS.map((channel, i) => [channel, catalogsByChannel[i]]),
      ) as OutletBundle["catalogByChannel"];
      outletData[outlet.id] = { catalogByChannel, tables, heldOrders };
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
