"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRoleMenuPermission } from "@/app/settings/actions";
import type { MenuItemRecord, PermissionPair, RoleRecord } from "@/lib/menu-permissions";

export function PermissionMatrix({
  roles,
  menuItems,
  permissions,
}: {
  roles: RoleRecord[];
  menuItems: MenuItemRecord[];
  permissions: PermissionPair[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  function isAllowed(roleId: number, menuItemId: number): boolean {
    return permissions.some((p) => p.roleId === roleId && p.menuItemId === menuItemId);
  }

  function toggle(roleId: number, menuItemId: number, allowed: boolean) {
    const cellKey = `${roleId}-${menuItemId}`;
    setPendingCell(cellKey);
    startTransition(async () => {
      await setRoleMenuPermission({ roleId, menuItemId, allowed });
      router.refresh();
      setPendingCell(null);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900">Role → Menu Access</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Controls which sidebar menus each role sees. This does not change page-level access
          rules — a role denied here that still has a direct link would still be blocked by the
          page itself.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">Role</th>
              {menuItems.map((m) => (
                <th key={m.id} className="px-5 py-3 text-center font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900">{role.name}</td>
                {menuItems.map((m) => {
                  const cellKey = `${role.id}-${m.id}`;
                  const allowed = isAllowed(role.id, m.id);
                  return (
                    <td key={m.id} className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allowed}
                        disabled={isPending && pendingCell === cellKey}
                        onChange={(e) => toggle(role.id, m.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
