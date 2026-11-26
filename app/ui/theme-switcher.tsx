"use client";

import { useTheme } from "@/app/theme-provider";
import { useI18n } from "@/app/i18n-provider";
import { MonitorIcon, MoonIcon, SunIcon } from "@/app/ui/icons";
import type { ThemePreference } from "@/lib/theme/shared";

const OPTIONS: {
  value: ThemePreference;
  labelKey: "login.themeLight" | "login.themeDark" | "login.themeSystem";
  Icon: typeof SunIcon;
}[] = [
  { value: "light", labelKey: "login.themeLight", Icon: SunIcon },
  { value: "dark", labelKey: "login.themeDark", Icon: MoonIcon },
  { value: "system", labelKey: "login.themeSystem", Icon: MonitorIcon },
];

/**
 * Light / Dark / System segmented control.
 * `variant="sidebar"` is styled for the always-dark sidebar; `showLabels`
 * adds the text next to each icon.
 */
export function ThemeSwitcher({
  variant = "default",
  showLabels = false,
  className,
}: {
  variant?: "default" | "sidebar";
  showLabels?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const sidebar = variant === "sidebar";

  return (
    <div
      role="radiogroup"
      aria-label={t("login.theme")}
      className={`inline-flex items-center gap-0.5 rounded-lg p-0.5 ${
        sidebar ? "bg-white/5" : "border border-gray-200 bg-white"
      } ${className ?? ""}`}
    >
      {OPTIONS.map(({ value, labelKey, Icon }) => {
        const active = theme === value;
        const tone = sidebar
          ? active
            ? "bg-white/15 text-white"
            : "text-white/50 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-amber-50 text-amber-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700";
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${tone}`}
          >
            <Icon className="h-4 w-4" />
            {showLabels && <span>{t(labelKey)}</span>}
          </button>
        );
      })}
    </div>
  );
}
