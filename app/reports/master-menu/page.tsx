import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getMasterMenu } from "@/lib/master-menu";
import { COMPANY_NAME } from "@/lib/report-labels";
import { ACCOUNTING_REPORT_ROLES } from "@/lib/report-route";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { ReportDownload } from "@/app/ui/reports/report-filters";
import { PageHeader } from "@/app/ui/page-header";
import { getT } from "@/lib/i18n/server";

export default async function MasterMenuPage({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const session = await requireRole(ACCOUNTING_REPORT_ROLES);
  const { t } = await getT();
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;
  const outlet = outlets.find((o) => o.id === Number(params.outlet)) ?? outlets[0];
  const rows = outlet ? await getMasterMenu(outlet.id) : [];

  return (
    <>
      <PageHeader eyebrow={t("nav.reports")} title={t("nav.masterMenu")}>
        <OutletSelect outlets={outlets} selectedOutletId={outlet?.id ?? 0} />
        {outlet && (
          <ReportDownload
            exportUrl={`/reports/master-menu/export?outlet=${outlet.id}`}
            filename={`master-menu-${outlet.code}.xlsx`}
          />
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mb-3 text-xs text-gray-400">{t("reports.masterMenuHint")}</p>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-900">{t("nav.masterMenu")}</h2>
            <p className="text-sm text-gray-500">
              {COMPANY_NAME} · {outlet?.name}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">{t("reports.colMenuId")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colMenuName")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colCategory")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colTax")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colOtherTax")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colCustomerPrint")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colSalesAccount")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colCogsAccount")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colDiscountAccount")}</th>
                  <th className="px-4 py-3 font-medium">{t("reports.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.menuId} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-500">{r.menuId}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-2 text-gray-500">{r.category}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">{t("reports.yesTax")}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">{t("reports.yesServiceCharge")}</td>
                    <td className="px-4 py-2 text-gray-700">{t("reports.yes")}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">{r.salesAccount}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {r.cogsAccount ? t("reports.cogsPerIngredient") : <span className="text-gray-400">{t("reports.noRecipe")}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-400">-</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.active ? t("reports.active") : t("reports.notActive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
