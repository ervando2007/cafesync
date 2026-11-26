import { LoginHero } from "@/app/ui/login-hero";
import { ForgotPasswordForm } from "@/app/ui/forgot-password-form";
import { getT } from "@/lib/i18n/server";
import { ThemeSwitcher } from "@/app/ui/theme-switcher";

export default async function ForgotPasswordPage() {
  const { t } = await getT();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f2ece2] p-4 sm:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <LoginHero />

        <div className="flex flex-col p-8 sm:p-12 lg:p-16">
          <div className="flex justify-end">
            <ThemeSwitcher />
          </div>
          <div className="mt-6 flex flex-1 flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {t("login.forgotPasswordTitle")}
            </h2>
            <p className="mt-2 text-gray-500">
              {t("login.forgotPasswordDesc")}
            </p>

            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
