import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getAccounts, getJournalEntries } from "@/lib/accounting";
import { getStockItemOptions } from "@/lib/inventory";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { JournalEntriesTable } from "@/app/ui/accounting/journal-entries-table";
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

export default async function JournalPage({
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

  const [entries, accounts, stockItems] = await Promise.all([
    getJournalEntries(selectedOutletId, from, to),
    getAccounts(),
    getStockItemOptions(selectedOutletId),
  ]);

  const canPost = roles.some((r) => POSTER_ROLES.includes(r));
  const outletName = outlets.find((o) => o.id === selectedOutletId)?.name ?? "";

  return (
    <>
      <div className="print:hidden">
        <PageHeader eyebrow={t("nav.accounting")} title={t("nav.journalEntries")}>
          <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
          <DateRangeSelect from={from} to={to} />
          <a
            href="/accounting/coa/export"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("accounting.downloadCoa")}
          </a>
        </PageHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 print:overflow-visible print:p-0">
        <JournalEntriesTable
          outletId={selectedOutletId}
          outletName={outletName}
          entries={entries}
          accounts={accounts}
          stockItems={stockItems}
          canPost={canPost}
        />
      </div>
    </>
  );
}
