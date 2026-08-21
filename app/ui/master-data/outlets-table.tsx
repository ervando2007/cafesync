"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { OutletFormModal } from "@/app/ui/master-data/outlet-form-modal";
import { setOutletStatus } from "@/app/master-data/actions";
import type { OutletRecord } from "@/lib/outlets";
import { useI18n } from "@/app/i18n-provider";

export function OutletsTable({ outlets }: { outlets: OutletRecord[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [modalOutlet, setModalOutlet] = useState<OutletRecord | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleStatus(outlet: OutletRecord) {
    const nextStatus = outlet.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setOutletStatus({ id: outlet.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("nav.outlets")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("masterData.manageOutletsDesc")}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOutlet("new")}
          className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t("masterData.addOutlet")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("masterData.colOutlet")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colCode")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colAddress")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colTimezone")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {outlets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  {t("masterData.noOutletsYet")}
                </td>
              </tr>
            ) : (
              outlets.map((outlet) => (
                <tr
                  key={outlet.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    outlet.status === "INACTIVE" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{outlet.name}</td>
                  <td className="px-5 py-3 text-gray-500">{outlet.code}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-gray-500">
                    {outlet.address ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{outlet.timezone}</td>
                  <td className="px-5 py-3">
                    {outlet.status === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {t("common.active")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        {t("common.inactive")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setModalOutlet(outlet)}
                        className="text-gray-400 hover:text-amber-700"
                        aria-label={t("inventory.editAriaLabel", { name: outlet.name })}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(outlet)}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                      >
                        {outlet.status === "ACTIVE" ? t("common.deactivate") : t("common.activate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOutlet && (
        <OutletFormModal
          mode={modalOutlet === "new" ? "create" : "edit"}
          outlet={modalOutlet === "new" ? undefined : modalOutlet}
          onClose={() => setModalOutlet(null)}
        />
      )}
    </div>
  );
}
