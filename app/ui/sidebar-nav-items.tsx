import {
  BoxIcon,
  CalculatorIcon,
  DatabaseIcon,
  GridIcon,
  SettingsIcon,
  ShoppingCartIcon,
} from "@/app/ui/dashboard/icons";
import type { SidebarNavItem } from "@/app/ui/sidebar-nav";

export const dashboardNavItem: SidebarNavItem = {
  label: "Dashboard",
  icon: GridIcon,
  href: "/dashboard",
};

export const posNavItem: SidebarNavItem = { label: "POS", icon: ShoppingCartIcon, href: "/pos" };

export const masterDataNavItem: SidebarNavItem = {
  label: "Master Data",
  icon: DatabaseIcon,
  children: [
    { label: "Outlets", href: "/master-data/outlets" },
    { label: "Products", href: "/master-data/products" },
  ],
};

export const inventoryNavItem: SidebarNavItem = {
  label: "Inventory",
  icon: BoxIcon,
  children: [
    { label: "Items", href: "/inventory/items" },
    { label: "Stock In", href: "/inventory/stock-in" },
    { label: "Stock Out", href: "/inventory/stock-out" },
    { label: "Adjustments", href: "/inventory/adjustments" },
    { label: "Transfers", href: "/inventory/transfers" },
    { label: "Recipe", href: "/inventory/recipe" },
    { label: "HPP", href: "/inventory/hpp" },
  ],
};

export const settingsNavItem: SidebarNavItem = {
  label: "Settings",
  icon: SettingsIcon,
  children: [{ label: "User Management", href: "/settings/users" }],
};

export const accountingNavItem: SidebarNavItem = {
  label: "Accounting",
  icon: CalculatorIcon,
  children: [
    { label: "Journal Entries", href: "/accounting/journal" },
    { label: "Cash Transactions", href: "/accounting/cash" },
    { label: "Profit & Loss", href: "/accounting/profit-loss" },
    { label: "Cash Flow", href: "/accounting/cash-flow" },
  ],
};

const NAV_ITEMS_BY_MENU_KEY: { key: string; item: SidebarNavItem }[] = [
  { key: "dashboard", item: dashboardNavItem },
  { key: "pos", item: posNavItem },
  { key: "inventory", item: inventoryNavItem },
  { key: "master_data", item: masterDataNavItem },
  { key: "accounting", item: accountingNavItem },
  { key: "settings", item: settingsNavItem },
];

export function navItemsForMenuKeys(visibleMenuKeys: string[]): SidebarNavItem[] {
  return NAV_ITEMS_BY_MENU_KEY.filter(({ key }) => visibleMenuKeys.includes(key)).map(
    ({ item }) => item,
  );
}
