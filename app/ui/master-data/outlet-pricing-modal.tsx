"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/app/ui/pos/icons";
import {
  getOutletPricesForProductChannel,
  removeOutletProduct,
  upsertOutletProduct,
} from "@/app/master-data/actions";
import type { OutletPriceRow } from "@/lib/products";
import { PRICING_CHANNELS, type PricingChannel } from "@/lib/pricing-channel";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function channelLabels(t: TranslateFn): Record<PricingChannel, string> {
  return {
    DINE_IN: t("masterData.channelDineIn"),
    TAKEAWAY: t("masterData.channelTakeaway"),
    GRABFOOD: t("masterData.channelGrabfood"),
  };
}

function OutletPriceRowEditor({
  productId,
  channel,
  row,
}: {
  productId: number;
  channel: PricingChannel;
  row: OutletPriceRow;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [sellingPrice, setSellingPrice] = useState(row.sellingPrice ?? 0);
  const [taxRatePercent, setTaxRatePercent] = useState((row.taxRate ?? 0.1) * 100);
  const [isAvailable, setIsAvailable] = useState(row.isAvailable);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertOutletProduct({
        outletId: row.outletId,
        productId,
        channel,
        sellingPrice,
        taxRate: taxRatePercent / 100,
        isAvailable,
      });
      if (!result.ok) {
        setMessage(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setMessage(t("masterData.saved"));
      router.refresh();
    });
  }

  function handleRemove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeOutletProduct({ outletId: row.outletId, productId, channel });
      if (!result.ok) {
        setMessage(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setSellingPrice(0);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 border-b border-gray-50 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{row.outletName}</p>
        {!row.isSet && <p className="text-xs text-gray-400">{t("masterData.notConfiguredHint")}</p>}
        {message && <p className="text-xs text-amber-700">{message}</p>}
      </div>
      <div>
        <label className="block text-[11px] text-gray-400">{t("masterData.price")}</label>
        <input
          type="number"
          min={0}
          value={sellingPrice}
          onChange={(e) => setSellingPrice(Number(e.target.value))}
          className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[11px] text-gray-400">{t("masterData.taxPercent")}</label>
        <input
          type="number"
          min={0}
          step="0.1"
          value={taxRatePercent}
          onChange={(e) => setTaxRatePercent(Number(e.target.value))}
          className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <label className="flex flex-col items-center gap-1 text-[11px] text-gray-400">
        {t("masterData.available")}
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {t("common.save")}
        </button>
        {row.isSet && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {t("common.remove")}
          </button>
        )}
      </div>
    </div>
  );
}

export function OutletPricingModal({
  productId,
  productName,
  outletPrices,
  onClose,
}: {
  productId: number;
  productName: string;
  outletPrices: OutletPriceRow[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const CHANNEL_LABEL = channelLabels(t);
  const [channel, setChannel] = useState<PricingChannel>("DINE_IN");
  const [rows, setRows] = useState<OutletPriceRow[]>(outletPrices);
  const [isLoading, startLoading] = useTransition();

  function handleChannelChange(next: PricingChannel) {
    setChannel(next);
    if (next === "DINE_IN") {
      setRows(outletPrices);
      return;
    }
    startLoading(async () => {
      const fresh = await getOutletPricesForProductChannel(productId, next);
      setRows(fresh);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("masterData.outletPricing")}</h2>
            <p className="text-xs text-gray-400">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("common.close")}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400">{t("masterData.setPricePerOutletHint")}</p>

        <div className="mt-3 flex gap-1.5">
          {PRICING_CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleChannelChange(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                channel === c ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("common.loading")}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("masterData.noActiveOutlets")}</p>
          ) : (
            rows.map((row) => (
              <OutletPriceRowEditor
                key={`${channel}-${row.outletId}`}
                productId={productId}
                channel={channel}
                row={row}
              />
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
