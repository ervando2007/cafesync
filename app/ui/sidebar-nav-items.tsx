import {
  BoxIcon,
  CalculatorIcon,
  DatabaseIcon,
  GridIcon,
  ReportIcon,
  SettingsIcon,
  ShoppingCartIcon,
} from "@/app/ui/dashboard/icons";
import type { SidebarNavItem } from "@/app/ui/sidebar-nav";
import type { TranslateFn } from "@/lib/i18n/translate";

function navItemsByMenuKey(t: TranslateFn): { key: string; item: SidebarNavItem }[] {
  return [
    { key: "dashboard", item: { label: t("nav.dashboard"), icon: GridIcon, href: "/dashboard" } },
    { key: "pos", item: { label: t("nav.pos"), icon: ShoppingCartIcon, href: "/pos" } },
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
          { label: t("nav.outlets"), href: "/master-data/outlets" },
          { label: t("nav.products"), href: "/master-data/products" },
          { label: t("nav.chartOfAccounts"), href: "/master-data/coa" },
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
          { label: t("nav.salesReport"), href: "/reports/sales" },
          { label: t("nav.stockReport"), href: "/reports/stock" },
          { label: t("nav.profitLossReport"), href: "/reports/profit-loss" },
          { label: t("nav.cashReport"), href: "/reports/cash" },
          { label: t("nav.bankReport"), href: "/reports/bank" },
          { label: t("nav.balanceSheetReport"), href: "/reports/balance-sheet" },
          { label: t("nav.generalLedger"), href: "/reports/general-ledger" },
          { label: t("nav.ledgerSummary"), href: "/reports/ledger-summary" },
          { label: t("nav.masterMenu"), href: "/reports/master-menu" },
        ],
      },
    },
    {
      key: "settings",
      item: {
        label: t("nav.settings"),
        icon: SettingsIcon,
        children: [{ label: t("nav.userManagement"), href: "/settings/users" }],
      },
    },
  ];
}

export function navItemsForMenuKeys(visibleMenuKeys: string[], t: TranslateFn): SidebarNavItem[] {
  return navItemsByMenuKey(t)
    .filter(({ key }) => visibleMenuKeys.includes(key))
    .map(({ item }) => item);
}
