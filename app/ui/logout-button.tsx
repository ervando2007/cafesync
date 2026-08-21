"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOutIcon } from "@/app/ui/dashboard/icons";
import { useI18n } from "@/app/i18n-provider";

export function LogoutButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={() => {
        setIsSigningOut(true);
        signOut({ callbackUrl: "/" });
      }}
      className={
        className ??
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
      }
    >
      <LogOutIcon className="h-4.5 w-4.5" />
      {isSigningOut ? t("nav.signingOut") : t("nav.logout")}
    </button>
  );
}
