"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/app/i18n-provider";
import { IdleLogout } from "@/app/ui/idle-logout";
import type { Dictionary, Locale } from "@/lib/i18n/translate";

export function Providers({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <IdleLogout />
      <I18nProvider locale={locale} dict={dict}>
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
