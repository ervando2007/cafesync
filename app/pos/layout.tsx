import { requireRole } from "@/lib/auth-guard";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getVisibleMenuKeyList } from "@/lib/menu-nav";
import { PosSidebar } from "@/app/ui/pos/sidebar";
import { getShiftCard } from "@/lib/shift-summary";

export default async function PosLayout({ children }: LayoutProps<"/pos">) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER", "CASHIER"]);
  const { userName, userRole } = resolveDisplayIdentity(session);
  const [visibleMenuKeys, shift] = await Promise.all([
    getVisibleMenuKeyList(session),
    getShiftCard(Number(session.user.id)),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f2] print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <PosSidebar
          userName={userName}
          userRole={userRole}
          avatarUrl={session.user.image}
          shift={shift}
          visibleMenuKeys={visibleMenuKeys}
        />
      </div>
      <div className="mt-14 flex h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-hidden lg:mt-0 lg:h-screen print:mt-0 print:h-auto print:overflow-visible">
        {children}
      </div>
    </div>
  );
}
