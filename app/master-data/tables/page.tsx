import QRCode from "qrcode";
import { getRequestBaseUrl } from "@/lib/base-url";
import { getTablesForManagement, tableOrderUrl } from "@/lib/dining-tables";
import { getOutletsForUser } from "@/lib/pos";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { TablesManager } from "@/app/ui/master-data/tables-manager";
import { QrisOutletGrid, type QrCardData } from "@/app/ui/master-data/qris-outlet-grid";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";
import { requireMenu } from "@/lib/menu-access";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireMenu("master_data");
  const { t } = await getT();
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const outlet = outlets.find((o) => o.id === Number(params.outlet)) ?? outlets[0] ?? null;
  const tables = outlet ? await getTablesForManagement(outlet.id) : [];
  const baseUrl = await getRequestBaseUrl();

  const cards: QrCardData[] = outlet
    ? await Promise.all(
        tables
          .filter((table) => table.status !== "INACTIVE")
          .map(async (table) => {
            const url = tableOrderUrl(baseUrl, outlet.code, table.code);
            const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220 });
            return { id: table.id, title: table.name, subtitle: outlet.name, url, svg };
          }),
      )
    : [];

  return (
    <>
      <div className="print:hidden">
        <PageHeader eyebrow={t("nav.masterData")} title={t("nav.tables")}>
          {outlet && <OutletSelect outlets={outlets} selectedOutletId={outlet.id} />}
        </PageHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0">
        {outlet ? (
          <>
            <div className="print:hidden">
              <TablesManager outletId={outlet.id} tables={tables} />
            </div>
            <div className="mt-10 print:mt-0">
              <QrisOutletGrid
                cards={cards}
                description={t("masterData.tableQrDesc")}
                emptyText={t("masterData.noTablesYet")}
                printSize="sticker"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">{t("masterData.noOutletsAvailable")}</p>
        )}
      </div>
    </>
  );
}
