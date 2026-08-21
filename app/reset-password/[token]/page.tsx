import { LoginHero } from "@/app/ui/login-hero";
import { ResetPasswordForm } from "@/app/ui/reset-password-form";
import { findValidResetToken } from "@/lib/password-reset";
import { getT } from "@/lib/i18n/server";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { t } = await getT();
  const valid = await findValidResetToken(token);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f2ece2] p-4 sm:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <LoginHero />

        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          {valid ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900">{t("login.resetPasswordTitle")}</h2>
              <p className="mt-2 text-gray-500">{t("login.resetPasswordDesc")}</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {t("login.errInvalidOrExpiredToken")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
