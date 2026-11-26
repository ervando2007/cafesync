/** Theme preference, stored in a cookie so the server renders the right one. */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_COOKIE = "cafesync-theme";
export const DEFAULT_THEME: ThemePreference = "system";
export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Runs inline in <head> before first paint: puts the `dark` class on <html>
 * from data-theme (set by the server from the cookie) and, for "system",
 * follows the OS setting live. React never renders the `dark` class itself,
 * so a re-render can't strip it.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p=d.getAttribute("data-theme");d.classList.toggle("dark",p==="dark"||(p!=="light"&&m.matches));}window.__cafesyncApplyTheme=a;a();m.addEventListener("change",a);})();`;
