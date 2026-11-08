"use client";

import { useState, useTransition } from "react";
import { XIcon } from "@/app/ui/pos/icons";
import { voidOrder } from "@/app/pos/actions";
import { useI18n } from "@/app/i18n-provider";

export function VoidOrderModal({
  outletId,
  orderId,
  onClose,
  onVoided,
}: {
  outletId: number;
  orderId?: number;
  onClose: () => void;
  onVoided: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await voidOrder({
        outletId,
        orderId,
        reason,
        managerEmail,
        managerPassword,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onVoided();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("pos.voidOrderTitle")}</h2>
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
          <div>
            <label className="text-xs text-gray-500">{t("pos.voidReasonLabel")}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("pos.voidReasonPlaceholder")}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
            {t("pos.voidManagerAuthHint")}
          </div>

          <div>
            <label className="text-xs text-gray-500">{t("pos.managerEmail")}</label>
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t("pos.managerPassword")}</label>
            <input
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
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
            disabled={isPending || !reason.trim() || !managerEmail.trim() || !managerPassword}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : t("pos.confirmVoid")}
          </button>
        </div>
      </div>
    </div>
  );
}
