import Image from "next/image";
import { CoffeeCupIcon, ShieldCheckIcon } from "@/app/ui/icons";
import { getT } from "@/lib/i18n/server";

export async function LoginHero() {
  const { t } = await getT();

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1b140f] p-10 text-white lg:flex">
      <Image
        src="/hero-coffee.png"
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,7,4,0.55) 0%, rgba(10,7,4,0.35) 45%, rgba(10,7,4,0.75) 100%)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <CoffeeCupIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xl font-bold leading-tight">
            Cafe<span className="text-amber-400">Sync</span>
          </p>
          <p className="text-xs text-white/60">{t("login.cafeManagementSystem")}</p>
        </div>
      </div>

      <div className="relative">
        <h1 className="text-4xl font-bold leading-tight">
          {t("login.heroTitleLine1")}
          <br />
          {t("login.heroTitleLine2")}
        </h1>
        <p className="mt-4 max-w-sm text-white/70">{t("login.heroSubtitle")}</p>
      </div>

      <div className="relative flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <ShieldCheckIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="font-semibold">{t("login.secureReliable")}</p>
          <p className="text-sm text-white/60">{t("login.secureReliableDesc")}</p>
        </div>
      </div>
    </div>
  );
}
