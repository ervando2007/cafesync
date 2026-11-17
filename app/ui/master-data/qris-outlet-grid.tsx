"use client";

import { useEffect, useState } from "react";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { PrinterIcon } from "@/app/ui/pos/icons";
import { QrPrintButton } from "@/app/ui/master-data/qr-print-button";
import { useI18n } from "@/app/i18n-provider";

export interface QrCardData {
  id: number;
  title: string;
  /** Printed under the title, e.g. the outlet name on a table's QR. */
  subtitle?: string;
  url: string;
  svg: string;
}

export function QrisOutletGrid({
  cards,
  description,
  emptyText,
  printSize = "a5",
}: {
  cards: QrCardData[];
  description?: string;
  emptyText?: string;
  /** "a5": counter/entrance poster. "sticker": 10×10 cm table sticker. */
  printSize?: "a5" | "sticker";
}) {
  const { t } = useI18n();
  const sticker = printSize === "sticker";
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
          <h2 className="text-base font-semibold text-gray-900">{t("masterData.qrCodes")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{description ?? t("masterData.qrCodesDesc")}</p>
        </div>
        <QrPrintButton />
      </div>

      {cards.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400 print:hidden">{emptyText ?? t("masterData.noOutletsAvailable")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 print:mt-0 print:block print:gap-0">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`qr-card flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm print:flex print:flex-col print:items-center print:justify-center print:break-after-page print:rounded-none print:border-0 print:shadow-none print:last:break-after-auto ${
                sticker
                  ? "print:h-[100mm] print:w-[100mm] print:overflow-hidden print:p-[3mm]"
                  : "print:h-[210mm] print:w-[148mm] print:p-0"
              } print:bg-[url('/hero-coffee.png')] print:bg-cover print:bg-center ${
                printOnlyId !== null && printOnlyId !== card.id ? "print:hidden" : ""
              }`}
            >
              <div
                className={`flex flex-col items-center ${
                  sticker
                    ? "print:rounded-[16px] print:bg-white/95 print:px-[6mm] print:py-[3mm] print:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    : "print:rounded-[28px] print:bg-white/95 print:px-12 print:py-14 print:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                }`}
              >
                <div className={`hidden items-center gap-2 print:flex ${sticker ? "print:mb-[1.5mm]" : "print:mb-8"}`}>
                  <span
                    className={`flex items-center justify-center rounded-lg bg-amber-50 text-amber-700 ${sticker ? "h-6 w-6" : "h-9 w-9"}`}
                  >
                    <CoffeeCupIcon className={sticker ? "h-3.5 w-3.5" : "h-5 w-5"} />
                  </span>
                  <p className={`font-bold text-gray-900 ${sticker ? "text-sm" : "text-lg"}`}>
                    Cafe<span className="text-amber-700">Sync</span>
                  </p>
                </div>

                <p
                  className={`text-lg font-bold text-gray-900 ${
                    sticker
                      ? "print:rounded-xl print:bg-amber-700 print:px-[5mm] print:py-[1mm] print:text-[8mm] print:font-extrabold print:leading-none print:text-white"
                      : "print:text-3xl"
                  }`}
                >
                  {card.title}
                </p>
                {card.subtitle && (
                  <p className={`text-sm text-gray-500 ${sticker ? "print:mt-[1mm] print:text-xs" : "print:mt-1 print:text-lg"}`}>
                    {card.subtitle}
                  </p>
                )}
                <p className={`hidden text-gray-500 print:block ${sticker ? "print:mt-[1mm] print:text-[10px]" : "text-sm print:mt-2"}`}>
                  {t("masterData.scanToOrder")}
                </p>

                <div
                  className={`mt-4 [&_svg]:h-56 [&_svg]:w-56 ${
                    sticker
                      ? "print:mt-[1.5mm] print:[&_svg]:h-[50mm] print:[&_svg]:w-[50mm]"
                      : "print:mt-8 print:[&_svg]:h-[85mm] print:[&_svg]:w-[85mm]"
                  }`}
                  dangerouslySetInnerHTML={{ __html: card.svg }}
                />

                <p className={`hidden text-xs text-gray-400 print:block ${sticker ? "print:mt-[1.5mm] print:text-[8px]" : "print:mt-8"}`}>
                  {t("masterData.poweredByCafeSync")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrintOnlyId(card.id)}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 print:hidden"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                {t("masterData.print")}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: ${sticker ? "100mm 100mm" : "A5"};
            margin: 0;
          }
          .qr-card {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
