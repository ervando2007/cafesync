import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function UnauthorizedPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2ece2] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">
          Role not supported yet
        </h1>
        <p className="mt-2 text-gray-500">
          {session?.user
            ? `Signed in as ${session.user.email}. Your role doesn't have access to any module yet.`
            : "You need to sign in to continue."}
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
                Sign Out
              </button>
            </form>
          ) : (
            <Link
              href="/"
              className="block w-full rounded-xl bg-amber-700 py-3 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Back to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
