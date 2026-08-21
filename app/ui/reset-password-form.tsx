"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n-provider";
import { resetPassword } from "@/app/reset-password/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await resetPassword({ token, newPassword, confirmPassword });
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="mt-8 space-y-5">
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {t("login.passwordResetSuccess")}
        </div>
        <Link
          href="/"
          className="block w-full rounded-xl bg-amber-700 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
        >
          {t("login.goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("settings.newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={t("settings.minSixChars")}
          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("profile.confirmNewPassword")}
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !newPassword}
        className="w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t("common.saving") : t("login.resetPasswordBtn")}
      </button>
    </div>
  );
}
