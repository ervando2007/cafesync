import { ChevronDownIcon } from "@/app/ui/icons";
import { BellIcon, StoreIcon } from "@/app/ui/dashboard/icons";
import type { OrderChannel } from "@/app/pos/actions";
import type { DiningTableOption, OutletOption } from "@/lib/pos";
import { useI18n } from "@/app/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function orderTypes(t: TranslateFn): { value: OrderChannel; label: string }[] {
  return [
    { value: "DINE_IN_STAFF", label: t("pos.dineIn") },
    { value: "TAKEAWAY", label: t("pos.takeaway") },
    { value: "DELIVERY", label: t("pos.delivery") },
  ];
}

const TABLE_STATUS_KEYS: Record<string, "pos.tableStatusAvailable" | "pos.tableStatusOccupied" | "pos.tableStatusReserved" | "pos.tableStatusInactive"> = {
  AVAILABLE: "pos.tableStatusAvailable",
  OCCUPIED: "pos.tableStatusOccupied",
  RESERVED: "pos.tableStatusReserved",
  INACTIVE: "pos.tableStatusInactive",
};

export function PosHeader({
  outlets,
  selectedOutletId,
  onOutletChange,
  orderType,
  onOrderTypeChange,
  tables,
  tableId,
  onTableChange,
  userName,
  userRole,
}: {
  outlets: OutletOption[];
  selectedOutletId: number;
  onOutletChange: (id: number) => void;
  orderType: OrderChannel;
  onOrderTypeChange: (type: OrderChannel) => void;
  tables: DiningTableOption[];
  tableId: number | null;
  onTableChange: (id: number | null) => void;
  userName: string;
  userRole: string;
}) {
  const { t } = useI18n();
  const initial = userName.trim().charAt(0).toUpperCase() || "U";
  const ORDER_TYPES = orderTypes(t);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="text-xs text-gray-500">{t("pos.outlet")}</label>
          <div className="relative mt-1">
            <select
              value={selectedOutletId}
              onChange={(e) => onOutletChange(Number(e.target.value))}
              className="appearance-none rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">{t("pos.orderTypeLabel")}</label>
          <div className="mt-1 flex rounded-lg border border-gray-200 p-0.5">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onOrderTypeChange(type.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  orderType === type.value
                    ? "bg-amber-700 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {orderType === "DINE_IN_STAFF" && (
          <div>
            <label className="text-xs text-gray-500">{t("pos.table")}</label>
            <div className="relative mt-1">
              <StoreIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={tableId ?? ""}
                onChange={(e) => onTableChange(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none rounded-lg border border-gray-200 py-2 pl-8 pr-8 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="">{t("pos.selectTablePlaceholder")}</option>
                {tables.map((table) => (
                  <option
                    key={table.id}
                    value={table.id}
                    disabled={table.status === "OCCUPIED" && table.id !== tableId}
                  >
                    {table.name}{" "}
                    {table.status !== "AVAILABLE" && TABLE_STATUS_KEYS[table.status]
                      ? `(${t(TABLE_STATUS_KEYS[table.status])})`
                      : ""}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <BellIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-sm font-semibold text-white">
            {initial}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">{userRole}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
