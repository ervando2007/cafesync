"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/app/i18n-provider";
import { CollapseIcon, ExpandIcon } from "@/app/ui/icons";

function subscribe(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

/**
 * Toggles browser fullscreen (handy for kiosk/POS tablets). Fullscreen ends on
 * any full page load; the installed PWA (app/manifest.ts) stays fullscreen.
 * `variant="sidebar"` is styled for the always-dark sidebar.
 */
export function FullscreenToggle({
  variant = "default",
  className,
}: {
  variant?: "default" | "sidebar";
  className?: string;
}) {
  const { t } = useI18n();
  const supported = useSyncExternalStore(
    subscribe,
    () => document.fullscreenEnabled,
    () => false,
  );
  const active = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement != null,
    () => false,
  );

  if (!supported) return null;

  const label = t(active ? "login.exitFullscreen" : "login.enterFullscreen");
  const Icon = active ? CollapseIcon : ExpandIcon;

  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Browser refused (e.g. iOS Safari) — nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition ${
        variant === "sidebar"
          ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      } ${className ?? ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
