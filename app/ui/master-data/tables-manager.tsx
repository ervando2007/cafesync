"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import {
  addTablesBulk,
  createTable,
  setTableActive,
  updateTable,
} from "@/app/master-data/table-actions";
import type { DiningTableRecord, DiningTableStatus } from "@/lib/dining-tables";
import type { TranslationKey } from "@/lib/i18n/translate";
import { useI18n } from "@/app/i18n-provider";

const STATUS_STYLE: Record<DiningTableStatus, { key: TranslationKey; className: string }> = {
  AVAILABLE: { key: "pos.tableStatusAvailable", className: "bg-emerald-50 text-emerald-700" },
  OCCUPIED: { key: "pos.tableStatusOccupied", className: "bg-amber-50 text-amber-700" },
  RESERVED: { key: "pos.tableStatusReserved", className: "bg-sky-50 text-sky-700" },
  INACTIVE: { key: "pos.tableStatusInactive", className: "bg-gray-100 text-gray-500" },
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none";

export function TablesManager({
  outletId,
  tables,
}: {
  outletId: number;
  tables: DiningTableRecord[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [modal, setModal] = useState<DiningTableRecord | "new" | "bulk" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(table: DiningTableRecord) {
    setError(null);
    startTransition(async () => {
      const result = await setTableActive({
        outletId,
        id: table.id,
        active: table.status === "INACTIVE",
      });
      if (!result.ok) setError(result.message ?? t("common.somethingWentWrong"));
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("nav.tables")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {t("masterData.manageTablesDesc", { count: tables.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal("bulk")}
            className="flex items-center gap-1.5 rounded-lg border border-amber-700 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("masterData.addTablesBulk")}
          </button>
          <button
            type="button"
            onClick={() => setModal("new")}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("masterData.addTable")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="px-5 py-3 font-medium">{t("masterData.colCode")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colTableName")}</th>
              <th className="px-5 py-3 font-medium">{t("masterData.colCapacity")}</th>
              <th className="px-5 py-3 font-medium">{t("inventory.colStatus")}</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tables.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                  {t("masterData.noTablesYet")}
                </td>
              </tr>
            ) : (
              tables.map((table) => {
                const status = STATUS_STYLE[table.status] ?? STATUS_STYLE.INACTIVE;
                return (
                  <tr
                    key={table.id}
                    className={`border-b border-gray-50 last:border-0 ${
                      table.status === "INACTIVE" ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{table.code}</td>
                    <td className="px-5 py-3 text-gray-700">{table.name}</td>
                    <td className="px-5 py-3 text-gray-500">{table.capacity}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        {t(status.key)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setModal(table)}
                          className="text-gray-400 hover:text-amber-700"
                          aria-label={t("inventory.editAriaLabel", { name: table.name })}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(table)}
                          disabled={isPending || table.status === "OCCUPIED"}
                          className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                        >
                          {table.status === "INACTIVE" ? t("common.activate") : t("common.deactivate")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal === "bulk" && <BulkAddModal outletId={outletId} onClose={() => setModal(null)} />}
      {modal !== null && modal !== "bulk" && (
        <TableFormModal
          outletId={outletId}
          table={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  error,
  onClose,
  onSubmit,
  isPending,
  submitLabel,
  children,
}: {
  title: string;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("common.close")}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">{children}</div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("common.saving") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableFormModal({
  outletId,
  table,
  onClose,
}: {
  outletId: number;
  table?: DiningTableRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState(table?.code ?? "");
  const [name, setName] = useState(table?.name ?? "");
  const [capacity, setCapacity] = useState(String(table?.capacity ?? 4));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    const input = { outletId, code, name, capacity: Number(capacity) };
    startTransition(async () => {
      const result = table ? await updateTable({ ...input, id: table.id }) : await createTable(input);
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <ModalShell
      title={table ? t("masterData.editTableTitle") : t("masterData.addTable")}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={t("masterData.saveTable")}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">{t("masterData.colCode")}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="T07"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("masterData.colCapacity")}</label>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">{t("masterData.colTableName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Table 07"
          className={INPUT_CLASS}
        />
      </div>
      {table && <p className="text-xs text-gray-400">{t("masterData.tableCodeChangeHint")}</p>}
    </ModalShell>
  );
}

function BulkAddModal({ outletId, onClose }: { outletId: number; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [count, setCount] = useState("4");
  const [capacity, setCapacity] = useState("4");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addTablesBulk({
        outletId,
        count: Number(count),
        capacity: Number(capacity),
      });
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <ModalShell
      title={t("masterData.addTablesBulk")}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={t("masterData.addTablesBulkSubmit")}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">{t("masterData.tableCount")}</label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t("masterData.colCapacity")}</label>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">{t("masterData.addTablesBulkHint")}</p>
    </ModalShell>
  );
}
