import Link from "next/link";
import { requireSession } from "@/lib/auth-guard";
import { findUserById } from "@/lib/users";
import { resolveDisplayIdentity } from "@/lib/role-labels";
import { getLandingPath } from "@/lib/role-routes";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { ChevronLeftIcon } from "@/app/ui/pos/icons";
import { AvatarUploader } from "@/app/ui/profile/avatar-uploader";
import { ProfileInfoForm } from "@/app/ui/profile/profile-info-form";
import { ChangePasswordForm } from "@/app/ui/profile/change-password-form";
import { LanguageSwitcher } from "@/app/ui/language-switcher";
import { getT } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const session = await requireSession();
  const { t } = await getT();
  const user = await findUserById(session.user.id);
  const { userRole } = resolveDisplayIdentity(session);
  const backHref = getLandingPath(session.user.roles);

  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-4">
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
          aria-label={t("common.back")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <CoffeeCupIcon className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm font-bold text-gray-900">
          Cafe<span className="text-amber-700">Sync</span>
        </p>
      </div>

      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium text-gray-400">{t("profile.account")}</p>
          <h1 className="text-2xl font-bold text-gray-900">{t("profile.myProfile")}</h1>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("profile.photo")}</h2>
          <div className="mt-4">
            <AvatarUploader initialAvatarUrl={user.avatar_url} initial={initial} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("profile.profileInformation")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{userRole}</p>
          <div className="mt-4">
            <ProfileInfoForm
              name={user.name}
              email={user.email}
              whatsappNumber={user.whatsapp_number ?? ""}
              address={user.address ?? ""}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("profile.changePasswordTitle")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {user.google_sub
              ? t("profile.alsoSignInGoogle")
              : t("profile.enterCurrentPasswordHint")}
          </p>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("profile.language")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("profile.languageDesc")}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
