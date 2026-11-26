"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { THEME_COOKIE, type ThemePreference } from "@/lib/theme/shared";

declare global {
  interface Window {
    __cafesyncApplyTheme?: () => void;
  }
}

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ initialTheme, children }: { initialTheme: ThemePreference; children: ReactNode }) {
  const [theme, setThemeState] = useState(initialTheme);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.setAttribute("data-theme", next);
    window.__cafesyncApplyTheme?.();
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
