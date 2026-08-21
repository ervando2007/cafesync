"use client";

import { useEffect, useState } from "react";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { PrinterIcon } from "@/app/ui/pos/icons";
import { QrPrintButton } from "@/app/ui/master-data/qr-print-button";

export interface QrCardData {
  outletId: number;
  outletName: string;
  url: string;
  svg: string;
}

export function QrisOutletGrid({ cards }: { cards: QrCardData[] }) {
  const [printOnlyId, setPrintOnlyId] = useState<number | null>(null);

  useEffect(() => {
    if (printOnlyId === null) return;

    function handleAfterPrint() {
      setPrintOnlyId(null);
    }

    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printOnlyId]);

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-base font-semibold text-gray-900">QR Codes</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            One QR per outlet — print and place it at the counter or entrance. Scanning it opens
            the order menu with the outlet already selected.
          </p>
        </div>
        <QrPrintButton />
      </div>

      {cards.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400 print:hidden">No outlets available.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 print:mt-0 print:block print:gap-0">
          {cards.map((card) => (
            <div
              key={card.outletId}
              className={`qr-card flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm print:flex print:h-[210mm] print:w-[148mm] print:flex-col print:items-center print:justify-center print:break-after-page print:rounded-none print:border-0 print:p-0 print:shadow-none print:last:break-after-auto ${
                printOnlyId !== null && printOnlyId !== card.outletId ? "print:hidden" : ""
              }`}
            >
              <div className="hidden items-center gap-2 print:mb-10 print:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <CoffeeCupIcon className="h-5 w-5" />
                </span>
                <p className="text-lg font-bold text-gray-900">
                  Cafe<span className="text-amber-700">Sync</span>
                </p>
              </div>

              <p className="text-lg font-bold text-gray-900 print:text-3xl">{card.outletName}</p>
              <p className="hidden text-sm text-gray-500 print:mt-2 print:block">
                Scan to view menu &amp; order
              </p>

              <div
                className="mt-4 [&_svg]:h-56 [&_svg]:w-56 print:mt-10 print:[&_svg]:h-[95mm] print:[&_svg]:w-[95mm]"
                dangerouslySetInnerHTML={{ __html: card.svg }}
              />

              <p className="hidden text-xs text-gray-400 print:mt-10 print:block">
                Powered by CafeSync
              </p>

              <button
                type="button"
                onClick={() => setPrintOnlyId(card.outletId)}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 print:hidden"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A5;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
