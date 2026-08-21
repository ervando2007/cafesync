"use client";

import { XIcon } from "@/app/ui/dashboard/icons";
import { useI18n } from "@/app/i18n-provider";

export interface SelectOption {
  id: number;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export function SelectModal({
  title,
  options,
  onSelect,
  onClose,
}: {
  title: string;
  options: SelectOption[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <p className="text-base font-bold text-gray-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="max-h-80 space-y-1.5 overflow-y-auto p-3">
          {options.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("order.nothingAvailable")}</p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.disabled}
                onClick={() => onSelect(option.id)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-left text-sm hover:border-amber-200 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-100 disabled:hover:bg-transparent"
              >
                <span className="font-medium text-gray-900">{option.label}</span>
                {option.sublabel && <span className="text-xs text-gray-400">{option.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
