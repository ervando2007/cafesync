"use client";

import { SidebarShell } from "@/app/ui/sidebar-shell";
import { useI18n } from "@/app/i18n-provider";

export function PosSidebar({
  userName,
  userRole,
  avatarUrl,
  shiftLabel,
  visibleMenuKeys,
}: {
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  shiftLabel: string;
  visibleMenuKeys: string[];
}) {
  const { t } = useI18n();
  return (
    <SidebarShell
      subtitle={t("nav.posSystem")}
      userName={userName}
      userRole={userRole}
      avatarUrl={avatarUrl}
      visibleMenuKeys={visibleMenuKeys}
      extra={
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60">{t("pos.currentShift")}</p>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {t("pos.open")}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold">{shiftLabel}</p>
          <button
            type="button"
            className="mt-1 text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            {t("pos.viewShiftDetail")}
          </button>
        </div>
      }
    />
  );
}
