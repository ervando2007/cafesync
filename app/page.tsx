import { ChevronDownIcon, GlobeIcon } from "@/app/ui/icons";
import { LoginHero } from "@/app/ui/login-hero";
import { LoginForm } from "@/app/ui/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f2ece2] p-4 sm:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <LoginHero />

        <div className="flex flex-col p-8 sm:p-12 lg:p-16">
          <div className="flex justify-end">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <GlobeIcon className="h-4 w-4" />
              English
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-1 flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-gray-500">
              Sign in to continue to your account
            </p>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
