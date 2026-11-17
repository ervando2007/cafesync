import { requireRole } from "@/lib/auth-guard";
import { getAllUsersForAdmin } from "@/lib/users";
import { getAllOutlets } from "@/lib/outlets";
import { getMenuItems, getPermissionMatrix, getRoles } from "@/lib/menu-permissions";
import { UsersTable } from "@/app/ui/settings/users-table";
import { PermissionMatrix } from "@/app/ui/settings/permission-matrix";
import { getT } from "@/lib/i18n/server";
import {
  allSubGm,
  isFullUserAdmin,
  SUB_GM_ROLE_CODES,
  USER_MANAGER_ROLES,
} from "@/lib/user-admin-scope";
import { PageHeader } from "@/app/ui/page-header";

export default async function UserManagementPage() {
  const session = await requireRole(USER_MANAGER_ROLES);
  const { t } = await getT();
  const fullAdmin = isFullUserAdmin(session);
  const currentUserId = Number(session.user.id);

  const [allUsers, outlets, allRoles, menuItems, permissions] = await Promise.all([
    getAllUsersForAdmin(),
    getAllOutlets(),
    getRoles(),
    getMenuItems(),
    getPermissionMatrix(),
  ]);

  // USER_ADMIN only sees and assigns roles below GM (actions enforce the same).
  const users = fullAdmin
    ? allUsers
    : allUsers.filter((u) => u.id !== currentUserId && allSubGm(u.roles.map((r) => r.code)));
  const roles = fullAdmin ? allRoles : allRoles.filter((r) => SUB_GM_ROLE_CODES.includes(r.code));

  return (
    <>
      <PageHeader eyebrow={t("nav.settings")} title={t("nav.userManagement")} />

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <UsersTable
          users={users}
          roles={roles}
          outlets={outlets}
          currentUserId={currentUserId}
        />

        {fullAdmin && (
          <div className="mt-6">
            <PermissionMatrix roles={allRoles} menuItems={menuItems} permissions={permissions} />
          </div>
        )}
      </div>
    </>
  );
}
