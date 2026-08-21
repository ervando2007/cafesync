"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { createUser, updateUser } from "@/app/settings/actions";
import type { UserRecord, UserRoleRef } from "@/lib/users";
import type { OutletRecord } from "@/lib/outlets";

const OUTLET_SCOPED_ROLE_CODES = ["MANAGER", "CASHIER"];

export function UserFormModal({
  mode,
  user,
  roles,
  outlets,
  onClose,
}: {
  mode: "create" | "edit";
  user?: UserRecord;
  roles: UserRoleRef[];
  outlets: OutletRecord[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>(user?.roles.map((r) => r.id) ?? []);
  const [outletIds, setOutletIds] = useState<number[]>(user?.outlets.map((o) => o.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOutlets = outlets.filter((o) => o.status === "ACTIVE");
  const needsOutletScope = roleIds.some((id) => {
    const role = roles.find((r) => r.id === id);
    return role && OUTLET_SCOPED_ROLE_CODES.includes(role.code);
  });

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleOutlet(id: number) {
    setOutletIds((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setError(null);
    const input = { name, email, roleIds, outletIds };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createUser({ ...input, password })
          : await updateUser({ ...input, id: user!.id });

      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "Add User" : "Edit User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Budi Santoso"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. budi@cafesync.local"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label className="text-xs text-gray-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">Roles</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          {needsOutletScope && (
            <div>
              <label className="text-xs text-gray-500">Outlet Access</label>
              <p className="mb-1.5 text-xs text-gray-400">
                Manager/Cashier roles are scoped to specific outlets. The first checked outlet is
                used as the default.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {activeOutlets.map((outlet) => (
                  <label
                    key={outlet.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={outletIds.includes(outlet.id)}
                      onChange={() => toggleOutlet(outlet.id)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                    />
                    {outlet.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save User"}
          </button>
        </div>
      </div>
    </div>
  );
}
