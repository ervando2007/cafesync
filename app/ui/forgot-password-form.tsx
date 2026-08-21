"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n-provider";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { MailIcon } from "@/app/ui/icons";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const result = await requestPasswordReset(email);
    setIsSubmitting(false);
    setMessage(result.message);
  }

  if (message) {
    return (
      <div className="mt-8 space-y-5">
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
        <Link
          href="/"
          className="block w-full rounded-xl bg-amber-700 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
        >
          {t("unauthorized.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("login.emailAddress")}
        </label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("login.emailPlaceholder")}
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("login.sending") : t("login.sendResetLink")}
      </button>

      <Link
        href="/"
        className="block text-center text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        {t("unauthorized.backToLogin")}
      </Link>
    </form>
  );
}
