import { MapPinIcon } from "@/app/ui/order/icons";

export function WelcomeBanner({
  outletName,
  onChangeOutlet,
}: {
  outletName: string | null;
  onChangeOutlet: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-3xl shadow-sm">
          ☕
        </span>
        <div>
          <p className="text-lg font-bold text-gray-900">Welcome to CafeSync</p>
          <p className="text-sm text-gray-500">
            Please choose your favorite menu and place your order 👋
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 shadow-sm sm:justify-start">
        <div>
          <p className="text-xs text-gray-400">Outlet</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <MapPinIcon className="h-4 w-4 text-amber-700" />
            {outletName ?? "Select an outlet"}
          </p>
        </div>
        <button
          type="button"
          onClick={onChangeOutlet}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Change
        </button>
      </div>
    </div>
  );
}
