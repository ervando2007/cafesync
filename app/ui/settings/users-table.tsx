"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { UserFormModal } from "@/app/ui/settings/user-form-modal";
import { ResetPasswordModal } from "@/app/ui/settings/reset-password-modal";
import { setUserStatus } from "@/app/settings/actions";
import type { UserRecord, UserRoleRef } from "@/lib/users";
import type { OutletRecord } from "@/lib/outlets";

export function UsersTable({
  users,
  roles,
  outlets,
  currentUserId,
}: {
  users: UserRecord[];
  roles: UserRoleRef[];
  outlets: OutletRecord[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [modalUser, setModalUser] = useState<UserRecord | "new" | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleStatus(user: UserRecord) {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setUserStatus({ id: user.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Users</h2>
          <p className="mt-0.5 text-xs text-gray-400">Manage staff accounts and role assignment.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalUser("new")}
          className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Roles</th>
              <th className="px-5 py-3 font-medium">Outlets</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    user.status !== "ACTIVE" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{user.email}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        user.roles.map((r) => (
                          <span
                            key={r.id}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          >
                            {r.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {user.outlets.length === 0
                      ? "All / N-A"
                      : user.outlets.map((o) => o.name).join(", ")}
                  </td>
                  <td className="px-5 py-3">
                    {user.status === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        {user.status === "LOCKED" ? "Locked" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setModalUser(user)}
                        className="text-gray-400 hover:text-amber-700"
                        aria-label={`Edit ${user.name}`}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetPasswordUser(user)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        disabled={isPending || user.id === currentUserId}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <UserFormModal
          mode={modalUser === "new" ? "create" : "edit"}
          user={modalUser === "new" ? undefined : modalUser}
          roles={roles}
          outlets={outlets}
          onClose={() => setModalUser(null)}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          userId={resetPasswordUser.id}
          userName={resetPasswordUser.name}
          onClose={() => setResetPasswordUser(null)}
        />
      )}
    </div>
  );
}
