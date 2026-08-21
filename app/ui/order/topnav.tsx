import Link from "next/link";
import { ChevronDownIcon, CoffeeCupIcon, GlobeIcon } from "@/app/ui/icons";

export function OrderTopNav() {
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
              GOOD COFFEE, GOOD DAY
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/order" className="border-b-2 border-amber-700 pb-1 text-sm font-semibold text-amber-700">
            Menu
          </Link>
        </nav>

        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 sm:flex"
        >
          <GlobeIcon className="h-4 w-4" />
          EN
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
