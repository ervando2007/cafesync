import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getT } from "@/lib/i18n/server";

export default async function UnauthorizedPage() {
  const session = await auth();
  const { t } = await getT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2ece2] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("unauthorized.roleNotSupported")}
        </h1>
        <p className="mt-2 text-gray-500">
          {session?.user
            ? t("unauthorized.signedInAs", { email: session.user.email ?? "" })
            : t("unauthorized.needSignIn")}
        </p>

        <div className="mt-6 space-y-3">
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800"
              >
                {t("unauthorized.signOut")}
              </button>
            </form>
          ) : (
            <Link
              href="/"
              className="block w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800"
            >
              {t("unauthorized.backToLogin")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
