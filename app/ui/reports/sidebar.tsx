"use client";

import { SidebarShell } from "@/app/ui/sidebar-shell";
import { useI18n } from "@/app/i18n-provider";

export function ReportsSidebar({
  userName,
  userRole,
  avatarUrl,
  visibleMenuKeys,
}: {
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  visibleMenuKeys: string[];
}) {
  const { t } = useI18n();
  return (
    <SidebarShell
      subtitle={t("nav.reports")}
      userName={userName}
      userRole={userRole}
      avatarUrl={avatarUrl}
      visibleMenuKeys={visibleMenuKeys}
    />
  );
}
