import { requireSession } from "@/lib/auth-guard";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getVisibleMenuKeyList } from "@/lib/menu-nav";
import { MasterDataSidebar } from "@/app/ui/master-data/sidebar";

export default async function MasterDataLayout({
  children,
}: LayoutProps<"/master-data">) {
  const session = await requireSession();
  const { userName, userRole } = resolveDisplayIdentity(session);
  const visibleMenuKeys = await getVisibleMenuKeyList(session);

  return (
    <div className="flex min-h-screen bg-[#f7f5f2]">
      <div className="print:hidden">
        <MasterDataSidebar
          userName={userName}
          userRole={userRole}
          avatarUrl={session.user.image}
          visibleMenuKeys={visibleMenuKeys}
        />
      </div>
      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden pt-14 lg:pt-0 print:pt-0">
        {children}
      </div>
    </div>
  );
}
