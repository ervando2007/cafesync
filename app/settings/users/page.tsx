import { requireRole } from "@/lib/auth-guard";
import { getAllUsersForAdmin } from "@/lib/users";
import { getOutletsForManagement } from "@/lib/outlets";
import { getMenuItems, getPermissionMatrix, getRoles } from "@/lib/menu-permissions";
import { UsersTable } from "@/app/ui/settings/users-table";
import { PermissionMatrix } from "@/app/ui/settings/permission-matrix";

export default async function UserManagementPage() {
  const session = await requireRole(["ADMIN"]);

  const [users, outlets, roles, menuItems, permissions] = await Promise.all([
    getAllUsersForAdmin(),
    getOutletsForManagement(session),
    getRoles(),
    getMenuItems(),
    getPermissionMatrix(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div>
        <p className="text-xs font-medium text-gray-400">Settings</p>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      </div>

      <div className="mt-6">
        <UsersTable
          users={users}
          roles={roles}
          outlets={outlets}
          currentUserId={Number(session.user.id)}
        />
      </div>

      <div className="mt-6">
        <PermissionMatrix roles={roles} menuItems={menuItems} permissions={permissions} />
      </div>
    </div>
  );
}
