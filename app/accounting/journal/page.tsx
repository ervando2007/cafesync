import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getAccounts, getJournalEntries } from "@/lib/accounting";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { DateRangeSelect } from "@/app/ui/inventory/date-range-select";
import { JournalEntriesTable } from "@/app/ui/accounting/journal-entries-table";

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

  const [entries, accounts] = await Promise.all([
    getJournalEntries(selectedOutletId, from, to),
    getAccounts(),
  ]);

  const canPost = roles.some((r) => POSTER_ROLES.includes(r));

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Accounting</p>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
          <DateRangeSelect from={from} to={to} />
        </div>
      </div>

      <div className="mt-6">
        <JournalEntriesTable
          outletId={selectedOutletId}
          entries={entries}
          accounts={accounts}
          canPost={canPost}
        />
      </div>
    </div>
  );
}
