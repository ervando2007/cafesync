"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateProfile } from "@/app/profile/actions";
import { useI18n } from "@/app/i18n-provider";

export function ProfileInfoForm({
  name,
  email,
  whatsappNumber,
  address,
}: {
  name: string;
  email: string;
  whatsappNumber: string;
  address: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const { t } = useI18n();
  const [nameInput, setNameInput] = useState(name);
  const [emailInput, setEmailInput] = useState(email);
  const [whatsappInput, setWhatsappInput] = useState(whatsappNumber);
  const [addressInput, setAddressInput] = useState(address);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile({
        name: nameInput,
        email: emailInput,
        whatsappNumber: whatsappInput,
        address: addressInput,
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message ?? t("common.somethingWentWrong") });
        return;
      }
      await update({});
      router.refresh();
      setMessage({ type: "info", text: t("profile.profileUpdatedSuccess") });
    });
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs text-gray-500">{t("settings.colName")}</label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("settings.colEmail")}</label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("profile.whatsappNumber")}</label>
          <input
            type="tel"
            value={whatsappInput}
            onChange={(e) => setWhatsappInput(e.target.value)}
            placeholder={t("profile.whatsappPlaceholder")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("masterData.colAddress")}</label>
          <input
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? t("common.saving") : t("common.saveChanges")}
        </button>
      </div>
    </div>
  );
}
