"use client";

import Link from "next/link";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { LanguageSwitcher } from "@/app/ui/language-switcher";
import { useI18n } from "@/app/i18n-provider";

export function OrderTopNav() {
  const { t } = useI18n();
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/order" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <CoffeeCupIcon className="h-5.5 w-5.5" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight text-gray-900">
              Cafe<span className="text-amber-700">Sync</span>
            </p>
            <p className="text-[10px] font-medium tracking-wide text-gray-400">
              {t("order.goodCoffeeGoodDay")}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/order" className="border-b-2 border-amber-700 pb-1 text-sm font-semibold text-amber-700">
            {t("order.menu")}
          </Link>
        </nav>

        <LanguageSwitcher className="hidden sm:block" />
      </div>
    </header>
  );
}
