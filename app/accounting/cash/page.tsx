import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getAccounts, getCashTransactions } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { CashTransactionsTable } from "@/app/ui/accounting/cash-transactions-table";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

const ALLOWED_ROLES = ["ADMIN", "GM", "ACCOUNTING"];
const POSTER_ROLES = ["ADMIN", "ACCOUNTING"];

function firstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string }>;
}) {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const roles = session.user.roles;
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const from = params.from ?? firstDayOfMonth();
  const to = params.to ?? today();

  const [transactions, accounts] = await Promise.all([
    getCashTransactions(selectedOutletId, from, to),
    getAccounts(),
  ]);

  const canPost = roles.some((r) => POSTER_ROLES.includes(r));

  return (
    <>
      <PageHeader eyebrow={t("nav.accounting")} title={t("nav.cashTransactions")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
        <DateRangeSelect from={from} to={to} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <CashTransactionsTable
          outletId={selectedOutletId}
          transactions={transactions}
          accounts={accounts}
          canPost={canPost}
        />
      </div>
    </>
  );
}
