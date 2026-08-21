import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireRole } from "@/lib/auth-guard";
import { getOutletsForManagement } from "@/lib/outlets";
import { OutletsTable } from "@/app/ui/master-data/outlets-table";
import { QrisOutletGrid, type QrCardData } from "@/app/ui/master-data/qris-outlet-grid";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function OutletsPage() {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const isGlobal = session.user.roles.some((r) => r === "ADMIN" || r === "GM");
  const outlets = await getOutletsForManagement(session);
  const baseUrl = await getBaseUrl();

  const activeOutlets = outlets.filter((o) => o.status === "ACTIVE");
  const cards: QrCardData[] = await Promise.all(
    activeOutlets.map(async (outlet) => {
      const url = `${baseUrl}/order?outlet=${outlet.code}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220 });
      return { outletId: outlet.id, outletName: outlet.name, url, svg };
    }),
  );

  return (
    <div className="p-6 sm:p-10 print:p-0">
      <div className="print:hidden">
        <p className="text-xs font-medium text-gray-400">Master Data</p>
        <h1 className="text-2xl font-bold text-gray-900">Outlets</h1>
      </div>

      {isGlobal && (
        <div className="mt-6 print:hidden">
          <OutletsTable outlets={outlets} />
        </div>
      )}

      <div className="mt-10 print:mt-0">
        <QrisOutletGrid cards={cards} />
      </div>
    </div>
  );
}
