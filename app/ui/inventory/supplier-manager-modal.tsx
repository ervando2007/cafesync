"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon, PlusIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import { createSupplier, updateSupplier, setSupplierStatus } from "@/app/inventory/actions";
import type { SupplierRecord } from "@/lib/inventory";

export function SupplierManagerModal({
  suppliers,
  onClose,
}: {
  suppliers: SupplierRecord[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setError(null);
    setEditing(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setView("form");
  }

  function openEdit(supplier: SupplierRecord) {
    setError(null);
    setEditing(supplier);
    setName(supplier.name);
    setContactPerson(supplier.contactPerson ?? "");
    setPhone(supplier.phone ?? "");
    setView("form");
  }

  function handleSave() {
    setError(null);
    const input = { name, contactPerson, phone };

    startTransition(async () => {
      const result = editing
        ? await updateSupplier({ ...input, id: editing.id })
        : await createSupplier(input);

      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
      setView("list");
    });
  }

  function toggleStatus(supplier: SupplierRecord) {
    const nextStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setSupplierStatus({ id: supplier.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {view === "list" ? "Manage Suppliers" : editing ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {view === "list" ? (
          <>
            <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
              {suppliers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No suppliers yet.</p>
              ) : (
                suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 ${
                      supplier.status === "INACTIVE" ? "opacity-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{supplier.name}</p>
                      {(supplier.contactPerson || supplier.phone) && (
                        <p className="truncate text-xs text-gray-400">
                          {[supplier.contactPerson, supplier.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(supplier)}
                      className="text-gray-400 hover:text-amber-700"
                      aria-label={`Edit ${supplier.name}`}
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(supplier)}
                      disabled={isPending}
                      className="shrink-0 text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                    >
                      {supplier.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={openAdd}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Supplier
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500">Supplier Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PT. Sumber Rasa Abadi"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Contact Person</label>
                <input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Budi Hartono"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 021-5550101"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
