import {
  BoxIcon,
  CalculatorIcon,
  ClockIcon,
  DatabaseIcon,
  GridIcon,
  ReportIcon,
  SettingsIcon,
  ShoppingCartIcon,
} from "@/app/ui/dashboard/icons";
import type { SidebarNavItem, SidebarNavLeaf, SidebarNavParent } from "@/app/ui/sidebar-nav";
import type { TranslateFn } from "@/lib/i18n/translate";

/** A sub-menu with `menuKey` is shown only when that key is visible too (lib/menu-rules.ts). */
type NavChild = { label: string; href: string; menuKey?: string };
type NavEntry = SidebarNavLeaf | (Omit<SidebarNavParent, "children"> & { children: NavChild[] });

function navItemsByMenuKey(t: TranslateFn): { key: string; item: NavEntry }[] {
  return [
    { key: "dashboard", item: { label: t("nav.dashboard"), icon: GridIcon, href: "/dashboard" } },
    { key: "pos", item: { label: t("nav.pos"), icon: ShoppingCartIcon, href: "/pos" } },
    {
      key: "attendance",
      item: { label: t("nav.attendance"), icon: ClockIcon, href: "/attendance" },
    },
    {
      key: "inventory",
      item: {
        label: t("nav.inventory"),
        icon: BoxIcon,
        children: [
          { label: t("nav.items"), href: "/inventory/items" },
          { label: t("nav.recipe"), href: "/inventory/recipe" },
        ],
      },
    },
    {
      key: "master_data",
      item: {
        label: t("nav.masterData"),
        icon: DatabaseIcon,
        children: [
          { label: t("nav.outlets"), href: "/master-data/outlets", menuKey: "master_data.outlets" },
          { label: t("nav.tables"), href: "/master-data/tables" },
          { label: t("nav.products"), href: "/master-data/products" },
          { label: t("nav.chartOfAccounts"), href: "/master-data/coa", menuKey: "master_data.coa" },
        ],
      },
    },
    {
      key: "accounting",
      item: {
        label: t("nav.accounting"),
        icon: CalculatorIcon,
        children: [{ label: t("nav.journalEntries"), href: "/accounting/journal" }],
      },
    },
    {
      key: "reports",
      item: {
        label: t("nav.reports"),
        icon: ReportIcon,
        children: [
          { label: t("nav.salesReport"), href: "/reports/sales", menuKey: "reports.sales" },
          { label: t("nav.stockReport"), href: "/reports/stock", menuKey: "reports.stock" },
          {
            label: t("nav.profitLossReport"),
            href: "/reports/profit-loss",
            menuKey: "reports.profit_loss",
          },
          { label: t("nav.cashReport"), href: "/reports/cash", menuKey: "reports.cash" },
          { label: t("nav.bankReport"), href: "/reports/bank", menuKey: "reports.bank" },
          {
            label: t("nav.balanceSheetReport"),
            href: "/reports/balance-sheet",
            menuKey: "reports.balance_sheet",
          },
          {
            label: t("nav.generalLedger"),
            href: "/reports/general-ledger",
            menuKey: "reports.general_ledger",
          },
          {
            label: t("nav.ledgerSummary"),
            href: "/reports/ledger-summary",
            menuKey: "reports.ledger_summary",
          },
          {
            label: t("nav.masterMenu"),
            href: "/reports/master-menu",
            menuKey: "reports.master_menu",
          },
          {
            label: t("nav.attendanceReport"),
            href: "/reports/attendance",
            menuKey: "reports.attendance",
          },
        ],
      },
    },
    {
      key: "settings",
      item: {
        label: t("nav.settings"),
        icon: SettingsIcon,
        children: [
          { label: t("nav.userManagement"), href: "/settings/users", menuKey: "settings.users" },
          {
            label: t("nav.attendanceDevices"),
            href: "/settings/attendance-devices",
            menuKey: "settings.attendance_devices",
          },
        ],
      },
    },
  ];
}

export function navItemsForMenuKeys(visibleMenuKeys: string[], t: TranslateFn): SidebarNavItem[] {
  return navItemsByMenuKey(t)
    .filter(({ key }) => visibleMenuKeys.includes(key))
    .map(({ item }): SidebarNavItem | null => {
      if (!("children" in item)) return item;
      const children = item.children
        .filter((c) => !c.menuKey || visibleMenuKeys.includes(c.menuKey))
        .map(({ label, href }) => ({ label, href }));
      return children.length ? { ...item, children } : null;
    })
    .filter((item): item is SidebarNavItem => item !== null);
}
