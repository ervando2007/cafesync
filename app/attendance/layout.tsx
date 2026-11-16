import { requireRole } from "@/lib/auth-guard";
import { ATTENDANCE_ROLES } from "@/lib/attendance";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getVisibleMenuKeyList } from "@/lib/menu-nav";
import { AttendanceSidebar } from "@/app/ui/attendance/sidebar";

export default async function AttendanceLayout({ children }: LayoutProps<"/attendance">) {
  const session = await requireRole(ATTENDANCE_ROLES);
  const { userName, userRole } = resolveDisplayIdentity(session);
  const visibleMenuKeys = await getVisibleMenuKeyList(session);

  return (
    <div className="flex min-h-screen bg-[#f7f5f2]">
      <div className="print:hidden">
        <AttendanceSidebar
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
