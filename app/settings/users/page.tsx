import { requireRole } from "@/lib/auth-guard";
import { getAllUsersForAdmin } from "@/lib/users";
import { getOutletsForManagement } from "@/lib/outlets";
import { getMenuItems, getPermissionMatrix, getRoles } from "@/lib/menu-permissions";
import { UsersTable } from "@/app/ui/settings/users-table";
import { PermissionMatrix } from "@/app/ui/settings/permission-matrix";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

export default async function UserManagementPage() {
  const session = await requireRole(["ADMIN"]);
  const { t } = await getT();

  const [users, outlets, roles, menuItems, permissions] = await Promise.all([
    getAllUsersForAdmin(),
    getOutletsForManagement(session),
    getRoles(),
    getMenuItems(),
    getPermissionMatrix(),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("nav.settings")} title={t("nav.userManagement")} />

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <UsersTable
          users={users}
          roles={roles}
          outlets={outlets}
          currentUserId={Number(session.user.id)}
        />

        <div className="mt-6">
          <PermissionMatrix roles={roles} menuItems={menuItems} permissions={permissions} />
        </div>
      </div>
    </>
  );
}
