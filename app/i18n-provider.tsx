"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Dictionary, type Locale, type TranslateFn } from "@/lib/i18n/translate";

interface I18nContextValue {
  locale: Locale;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  // Deliberately not copied into useState: this must always reflect the
  // latest server-resolved locale/dict props. A router.refresh() after
  // setLocale() re-runs the server layout and passes fresh props here; if we
  // seeded useState from props once, the value would go stale after the
  // first render (same class of bug as RecipeManager's selection state).
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: createTranslator(dict) }),
    [locale, dict],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
