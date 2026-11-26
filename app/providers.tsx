"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/app/i18n-provider";
import { IdleLogout } from "@/app/ui/idle-logout";
import type { Dictionary, Locale } from "@/lib/i18n/translate";
import { ThemeProvider } from "@/app/theme-provider";
import type { ThemePreference } from "@/lib/theme/shared";

export function Providers({
  locale,
  dict,
  theme,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  theme: ThemePreference;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <IdleLogout />
      <I18nProvider locale={locale} dict={dict}>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
