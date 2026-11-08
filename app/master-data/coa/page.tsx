import { requireRole } from "@/lib/auth-guard";
import { getAllAccountsForManagement } from "@/lib/accounting";
import { getOpeningBalanceCheck } from "@/lib/opening-balances";
import { getOutletsForUser } from "@/lib/pos";
import { CoaTable } from "@/app/ui/master-data/coa-table";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

function rp(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** COA per outlet, like Journal Entries: one outlet at a time, no combined view. */
export default async function ChartOfAccountsPage({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const session = await requireRole(["ADMIN", "ACCOUNTING"]);
  const { t } = await getT();
  const params = await searchParams;
  const outlets = await getOutletsForUser(session);
  const outlet = outlets.find((o) => o.id === Number(params.outlet)) ?? outlets[0];

  const [accounts, checks] = await Promise.all([getAllAccountsForManagement(), getOpeningBalanceCheck()]);
  const check = outlet ? checks.find((c) => c.outletId === outlet.id) : undefined;

  return (
    <>
      <PageHeader eyebrow={t("nav.masterData")} title={t("nav.chartOfAccounts")}>
        {outlet && <OutletSelect outlets={outlets} selectedOutletId={outlet.id} />}
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {check && (
          <div
            className={`mb-4 rounded-2xl border p-4 text-xs ${check.difference === 0 ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/60"}`}
          >
            <p className="text-sm font-semibold text-gray-900">
              {t("masterData.openingCheckTitle")} — {check.name} <span className="font-normal text-gray-400">({check.code})</span>
            </p>
            <p className="mt-0.5 text-gray-500">{t("masterData.openingCheckHint")}</p>
            <p className="mt-2 tabular-nums text-gray-700">
              {t("masterData.debitSide")} {rp(check.debit)} · {t("masterData.creditSide")} {rp(check.credit)} ·{" "}
              <span className={`font-semibold ${check.difference === 0 ? "text-emerald-700" : "text-red-700"}`}>
                {check.difference === 0
                  ? t("masterData.openingBalanced")
                  : t("masterData.openingUnbalanced", { amount: rp(Math.abs(check.difference)) })}
              </span>
            </p>
          </div>
        )}

        {outlet && (
          <CoaTable accounts={accounts} outlet={{ id: outlet.id, code: outlet.code, name: outlet.name }} />
        )}
      </div>
    </>
  );
}
