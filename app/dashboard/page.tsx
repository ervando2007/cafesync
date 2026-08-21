import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { DashboardTopbar } from "@/app/ui/dashboard/topbar";
import { StatCard } from "@/app/ui/dashboard/stat-card";
import { SalesOverviewChart } from "@/app/ui/dashboard/sales-overview-chart";
import { SalesByCategoryChart } from "@/app/ui/dashboard/sales-by-category-chart";
import { TopProducts } from "@/app/ui/dashboard/top-products";
import { SalesByOutlet } from "@/app/ui/dashboard/sales-by-outlet";
import { RecentOrders } from "@/app/ui/dashboard/recent-orders";
import { StockAlert } from "@/app/ui/dashboard/stock-alert";
import { CashFlowSummary } from "@/app/ui/dashboard/cash-flow-summary";
import {
  DollarSignIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  UsersIcon,
} from "@/app/ui/dashboard/icons";
import {
  getCashFlow,
  getRecentOrders,
  getSalesByCategory,
  getSalesByOutlet,
  getSalesOverview,
  getStatCards,
  getStockAlerts,
  getTopProducts,
  getTotalSalesLabel,
} from "@/lib/dashboard-data";

const STAT_ICONS = [DollarSignIcon, ShoppingCartIcon, UsersIcon, ReceiptIcon, TrendingUpIcon];

export default async function DashboardPage() {
  const session = await requireRole(["ADMIN", "GM", "MANAGER", "ACCOUNTING"]);
  const firstName = (session.user.name ?? session.user.email ?? "there").split(" ")[0];

  const outlets = await getOutletsForUser(session);
  const outletIds = outlets.map((o) => o.id);

  const [
    statCards,
    salesOverview,
    salesByCategory,
    totalSalesLabel,
    topProducts,
    salesByOutlet,
    recentOrders,
    stockAlerts,
    cashFlow,
  ] = await Promise.all([
    getStatCards(outletIds),
    getSalesOverview(outletIds),
    getSalesByCategory(outletIds),
    getTotalSalesLabel(outletIds),
    getTopProducts(outletIds),
    getSalesByOutlet(outletIds),
    getRecentOrders(outletIds),
    getStockAlerts(outletIds),
    getCashFlow(outletIds),
  ]);

  return (
    <>
      <DashboardTopbar
        title="Dashboard"
        subtitle={`Welcome back, ${firstName} \u{1F44B}`}
        notificationCount={8}
      />

      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card, index) => (
            <StatCard key={card.label} data={card} icon={STAT_ICONS[index]} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <SalesOverviewChart data={salesOverview} />
          </div>
          <div className="lg:col-span-1">
            <SalesByCategoryChart data={salesByCategory} totalLabel={totalSalesLabel} />
          </div>
          <div className="lg:col-span-1">
            <TopProducts data={topProducts} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SalesByOutlet data={salesByOutlet} />
          </div>
          <div className="lg:col-span-5">
            <RecentOrders data={recentOrders} />
          </div>
          <div className="lg:col-span-3">
            <StockAlert data={stockAlerts} />
          </div>
        </div>

        <CashFlowSummary data={cashFlow} />
      </div>
    </>
  );
}
