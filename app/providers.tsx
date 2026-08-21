"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/app/i18n-provider";
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
      <I18nProvider locale={locale} dict={dict}>
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
