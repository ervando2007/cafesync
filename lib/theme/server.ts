import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_THEME, isThemePreference, THEME_COOKIE, type ThemePreference } from "@/lib/theme/shared";

export async function getThemePreference(): Promise<ThemePreference> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemePreference(value) ? value : DEFAULT_THEME;
}
