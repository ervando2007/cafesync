"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import { createOutlet, updateOutlet } from "@/app/master-data/actions";
import type { OutletRecord } from "@/lib/outlets";
import { useI18n } from "@/app/i18n-provider";

export function OutletFormModal({
  mode,
  outlet,
  onClose,
}: {
  mode: "create" | "edit";
  outlet?: OutletRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState(outlet?.code ?? "");
  const [name, setName] = useState(outlet?.name ?? "");
  const [address, setAddress] = useState(outlet?.address ?? "");
  const [timezone, setTimezone] = useState(outlet?.timezone ?? "Asia/Jakarta");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    const input = { code, name, address, timezone };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOutlet(input)
          : await updateOutlet({ ...input, id: outlet!.id });

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? t("masterData.addOutlet") : t("masterData.editOutletTitle")}
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
              <label className="text-xs text-gray-500">{t("masterData.outletCode")}</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("masterData.outletCodePlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t("masterData.colTimezone")}</label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder={t("masterData.timezonePlaceholder")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.outletName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("masterData.outletNamePlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("masterData.colAddress")}</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder={t("masterData.addressPlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
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
            {isPending ? t("common.saving") : t("masterData.saveOutlet")}
          </button>
        </div>
      </div>
    </div>
  );
}
