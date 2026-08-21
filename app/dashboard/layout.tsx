import { requireSession } from "@/lib/auth-guard";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getVisibleMenuKeyList } from "@/lib/menu-nav";
import { DashboardSidebar } from "@/app/ui/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await requireSession();
  const { userName, userRole } = resolveDisplayIdentity(session);
  const visibleMenuKeys = await getVisibleMenuKeyList(session);

  return (
    <div className="flex min-h-screen bg-[#f7f5f2]">
      <DashboardSidebar userName={userName} userRole={userRole} visibleMenuKeys={visibleMenuKeys} />
      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
