"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n-provider";
import {
  requestPasswordReset,
  requestWhatsAppOtp,
  resetPasswordWithOtp,
} from "@/app/forgot-password/actions";
import { LockIcon, MailIcon, PhoneIcon } from "@/app/ui/icons";

type Channel = "email" | "whatsapp";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";
const PRIMARY_BTN =
  "w-full rounded-xl bg-amber-700 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60";
const LINK_CLASS = "block text-center text-sm font-medium text-amber-700 hover:text-amber-800";

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [channel, setChannel] = useState<Channel>("email");

  return (
    <div className="mt-8">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {(["email", "whatsapp"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={channel === value}
            onClick={() => setChannel(value)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
              channel === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {value === "email" ? <MailIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
            {value === "email" ? t("login.viaEmail") : t("login.viaWhatsApp")}
          </button>
        ))}
      </div>

      {channel === "email" ? <EmailResetForm /> : <WhatsAppResetForm />}
    </div>
  );
}

function EmailResetForm() {
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
      <div className="mt-6 space-y-5">
        <SuccessBox message={message} />
        <Link href="/" className={`block ${PRIMARY_BTN}`}>
          {t("unauthorized.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
        {isSubmitting ? t("login.sending") : t("login.sendResetLink")}
      </button>

      <Link href="/" className={LINK_CLASS}>
        {t("unauthorized.backToLogin")}
      </Link>
    </form>
  );
}

function WhatsAppResetForm() {
  const { t } = useI18n();
  const [step, setStep] = useState<"number" | "otp" | "done">("number");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function sendOtp() {
    setError(null);
    startTransition(async () => {
      const result = await requestWhatsAppOtp(whatsappNumber);
      setInfo(result.message);
      setStep("otp");
    });
  }

  function submitReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordWithOtp({ whatsappNumber, otp, newPassword, confirmPassword });
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <div className="mt-6 space-y-5">
        <SuccessBox message={t("login.passwordResetSuccess")} />
        <Link href="/" className={`block ${PRIMARY_BTN}`}>
          {t("login.goToLogin")}
        </Link>
      </div>
    );
  }

  if (step === "number") {
    return (
      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          sendOtp();
        }}
      >
        <p className="text-sm text-gray-500">{t("login.forgotPasswordDescWhatsApp")}</p>
        <div>
          <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("login.whatsappNumber")}
          </label>
          <div className="relative">
            <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder={t("login.whatsappPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <button type="submit" disabled={isPending || !whatsappNumber.trim()} className={PRIMARY_BTN}>
          {isPending ? t("login.sending") : t("login.sendOtp")}
        </button>

        <Link href="/" className={LINK_CLASS}>
          {t("unauthorized.backToLogin")}
        </Link>
      </form>
    );
  }

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submitReset();
      }}
    >
      {info && <SuccessBox message={info} />}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("login.otpCode")}
        </label>
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("login.otpPlaceholder")}
          className={`${INPUT_CLASS} pl-3 text-center text-lg font-semibold tracking-[0.5em]`}
        />
      </div>

      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("settings.newPassword")}
        </label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("settings.minSixChars")}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("profile.confirmNewPassword")}
        </label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <button type="submit" disabled={isPending || otp.length !== 6 || !newPassword} className={PRIMARY_BTN}>
        {isPending ? t("common.saving") : t("login.resetPasswordBtn")}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("number");
            setOtp("");
            setError(null);
            setInfo(null);
          }}
          className="font-medium text-gray-500 hover:text-gray-700"
        >
          {t("login.changeNumber")}
        </button>
        <button
          type="button"
          onClick={sendOtp}
          disabled={isPending}
          className="font-medium text-amber-700 hover:text-amber-800 disabled:opacity-60"
        >
          {t("login.resendOtp")}
        </button>
      </div>
    </form>
  );
}
