import "server-only";
import { getLocale } from "@/lib/i18n/locale";
import { createTranslator, getDictionary, type TranslateFn, type Locale } from "@/lib/i18n/translate";

export async function getT(): Promise<{ t: TranslateFn; locale: Locale }> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return { t: createTranslator(dict), locale };
}
