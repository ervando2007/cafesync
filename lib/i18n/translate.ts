import type { Locale } from "@/lib/i18n/locale";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

export type { Locale };

export type Dictionary = typeof en;

const DICTIONARIES: Record<Locale, Dictionary> = { en, id };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}`;
}[keyof T & string];

export type TranslationKey = NestedKeyOf<Dictionary>;

export type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function createTranslator(dict: Dictionary): TranslateFn {
  return (key: TranslationKey, params?: Record<string, string | number>) => {
    const value = key
      .split(".")
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === "object" && part in acc
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        dict,
      );
    let result = typeof value === "string" ? value : key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replaceAll(`{${paramKey}}`, String(paramValue));
      }
    }
    return result;
  };
}
