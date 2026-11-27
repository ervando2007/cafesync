"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { createUser, updateUser } from "@/app/settings/actions";
import type { UserRecord, UserRoleRef } from "@/lib/users";
import type { OutletRecord } from "@/lib/outlets";
import { useI18n } from "@/app/i18n-provider";
import { GLOBAL_OUTLET_ROLE_CODES, needsOutletAssignment } from "@/lib/role-scope";

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
  const { t } = useI18n();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [attendancePin, setAttendancePin] = useState(user?.attendancePin ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber ?? "");
  const [roleIds, setRoleIds] = useState<number[]>(user?.roles.map((r) => r.id) ?? []);
  const [outletIds, setOutletIds] = useState<number[]>(user?.outlets.map((o) => o.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOutlets = outlets.filter((o) => o.status === "ACTIVE");
  const selectedRoleCodes = roleIds
    .map((id) => roles.find((r) => r.id === id)?.code)
    .filter((code): code is string => !!code);
  const hasAllOutlets = selectedRoleCodes.some((code) => GLOBAL_OUTLET_ROLE_CODES.includes(code));
  const missingOutlet = needsOutletAssignment(selectedRoleCodes) && outletIds.length === 0;

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleOutlet(id: number) {
    setOutletIds((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setError(null);
    const input = { name, email, roleIds, outletIds, attendancePin, whatsappNumber };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createUser({ ...input, password })
          : await updateUser({ ...input, id: user!.id });

      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
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
            {mode === "create" ? t("settings.addUser") : t("settings.editUserTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("common.close")}
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
              <label className="text-xs text-gray-500">{t("settings.colName")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.namePlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("settings.colEmail")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("settings.emailPlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label className="text-xs text-gray-500">{t("settings.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("settings.minPasswordChars")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">{t("login.whatsappNumber")}</label>
            <input
              type="tel"
              inputMode="tel"
              value={whatsappNumber}
              maxLength={30}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder={t("login.whatsappPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{t("settings.whatsappHint")}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("settings.attendancePin")}</label>
            <input
              value={attendancePin}
              inputMode="numeric"
              maxLength={20}
              onChange={(e) => setAttendancePin(e.target.value.replace(/\D/g, ""))}
              placeholder={t("settings.attendancePinPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{t("settings.attendancePinHint")}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("settings.roles")}</label>
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

          <div>
            <label className="text-xs text-gray-500">{t("settings.outletAccess")}</label>
            {hasAllOutlets ? (
              <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                {t("settings.outletAccessAll")}
              </p>
            ) : (
              <>
                <p className="mb-1.5 text-xs text-gray-400">{t("settings.outletAccessHint")}</p>
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
                {missingOutlet && (
                  <p className="mt-1.5 text-xs font-medium text-amber-700">
                    {t("settings.errSelectOutlet")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : t("settings.saveUser")}
          </button>
        </div>
      </div>
    </div>
  );
}
