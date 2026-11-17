"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRoleMenuPermission } from "@/app/settings/actions";
import type { MenuItemRecord, PermissionPair, RoleRecord } from "@/lib/menu-permissions";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn, TranslationKey } from "@/lib/i18n/translate";

const MENU_KEY_TO_NAV_KEY: Record<string, TranslationKey> = {
  dashboard: "nav.dashboard",
  pos: "nav.pos",
  inventory: "nav.inventory",
  master_data: "nav.masterData",
  accounting: "nav.accounting",
  settings: "nav.settings",
  reports: "nav.reports",
  attendance: "nav.attendance",
  "reports.sales": "nav.salesReport",
  "reports.stock": "nav.stockReport",
  "reports.profit_loss": "nav.profitLossReport",
  "reports.cash": "nav.cashReport",
  "reports.bank": "nav.bankReport",
  "reports.balance_sheet": "nav.balanceSheetReport",
  "reports.general_ledger": "nav.generalLedger",
  "reports.ledger_summary": "nav.ledgerSummary",
  "reports.master_menu": "nav.masterMenu",
  "reports.attendance": "nav.attendanceReport",
};

const REPORT_PREFIX = "reports.";

function menuLabel(m: MenuItemRecord, t: TranslateFn): string {
  const navKey = MENU_KEY_TO_NAV_KEY[m.menuKey];
  return navKey ? t(navKey) : m.label;
}

/** Two tables: sections (Dashboard, POS, ...) and, separately, each report. */
export function PermissionMatrix({
  roles,
  menuItems,
  permissions,
}: {
  roles: RoleRecord[];
  menuItems: MenuItemRecord[];
  permissions: PermissionPair[];
}) {
  const { t } = useI18n();
  const sections = menuItems.filter((m) => !m.menuKey.startsWith(REPORT_PREFIX));
  const reports = menuItems.filter((m) => m.menuKey.startsWith(REPORT_PREFIX));
  return (
    <div className="space-y-6">
      <MatrixTable
        title={t("settings.roleMenuAccess")}
        description={t("settings.roleMenuAccessDesc")}
        roles={roles}
        menuItems={sections}
        permissions={permissions}
      />
      {reports.length > 0 && (
        <MatrixTable
          title={t("settings.roleReportAccess")}
          description={t("settings.roleReportAccessDesc")}
          roles={roles}
          menuItems={reports}
          permissions={permissions}
        />
      )}
    </div>
  );
}

function MatrixTable({
  title,
  description,
  roles,
  menuItems,
  permissions,
}: {
  title: string;
  description: string;
  roles: RoleRecord[];
  menuItems: MenuItemRecord[];
  permissions: PermissionPair[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  function isAllowed(roleId: number, menuItemId: number): boolean {
    return permissions.some((p) => p.roleId === roleId && p.menuItemId === menuItemId);
  }

  function toggle(roleId: number, menuItemId: number, allowed: boolean) {
    const cellKey = `${roleId}-${menuItemId}`;
    setPendingCell(cellKey);
    startTransition(async () => {
      await setRoleMenuPermission({ roleId, menuItemId, allowed });
      router.refresh();
      setPendingCell(null);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("settings.colRole")}</th>
              {menuItems.map((m) => (
                <th key={m.id} className="px-5 py-3 text-center font-medium">
                  {menuLabel(m, t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900">{role.name}</td>
                {menuItems.map((m) => {
                  const cellKey = `${role.id}-${m.id}`;
                  const allowed = isAllowed(role.id, m.id);
                  return (
                    <td key={m.id} className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allowed}
                        disabled={isPending && pendingCell === cellKey}
                        onChange={(e) => toggle(role.id, m.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
