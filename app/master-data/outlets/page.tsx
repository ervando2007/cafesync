import QRCode from "qrcode";
import { getRequestBaseUrl } from "@/lib/base-url";
import { getOutletsForManagement } from "@/lib/outlets";
import { OutletsTable } from "@/app/ui/master-data/outlets-table";
import { QrisOutletGrid, type QrCardData } from "@/app/ui/master-data/qris-outlet-grid";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";
import { requireMenu } from "@/lib/menu-access";
import { SUBMENU_ROLES } from "@/lib/menu-rules";

export default async function OutletsPage() {
  const session = await requireMenu("master_data", SUBMENU_ROLES["master_data.outlets"]);
  const { t } = await getT();
  const outlets = await getOutletsForManagement(session);
  const baseUrl = await getRequestBaseUrl();

  const activeOutlets = outlets.filter((o) => o.status === "ACTIVE");
  const cards: QrCardData[] = await Promise.all(
    activeOutlets.map(async (outlet) => {
      const url = `${baseUrl}/order?outlet=${outlet.code}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220 });
      return { id: outlet.id, title: outlet.name, url, svg };
    }),
  );

  return (
    <>
      <div className="print:hidden">
        <PageHeader eyebrow={t("nav.masterData")} title={t("nav.outlets")} />
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0">
        <div className="print:hidden">
          <OutletsTable outlets={outlets} />
        </div>

        <div className="mt-10 print:mt-0">
          <QrisOutletGrid cards={cards} />
        </div>
      </div>
    </>
  );
}
