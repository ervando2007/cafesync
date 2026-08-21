"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon, PlusIcon } from "@/app/ui/pos/icons";
import { EditIcon } from "@/app/ui/inventory/icons";
import {
  createProductCategory,
  updateProductCategory,
  setProductCategoryStatus,
} from "@/app/master-data/actions";
import type { ProductCategoryOption } from "@/lib/products";

export function ProductCategoryManagerModal({
  categories,
  onClose,
}: {
  categories: ProductCategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    const name = newName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await createProductCategory({ name });
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  function startEdit(category: ProductCategoryOption) {
    setError(null);
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function handleSaveEdit() {
    setError(null);
    const name = editingName.trim();
    if (!name || editingId === null) return;

    startTransition(async () => {
      const result = await updateProductCategory({ id: editingId, name });
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function toggleStatus(category: ProductCategoryOption) {
    setError(null);
    const nextStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setProductCategoryStatus({ id: category.id, status: nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>
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

        <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className={`flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 ${
                  category.status === "INACTIVE" ? "opacity-50" : ""
                }`}
              >
                {editingId === category.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    onBlur={handleSaveEdit}
                    className="min-w-0 flex-1 rounded-md border border-amber-500 px-2 py-1 text-sm focus:outline-none"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                    {category.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(category)}
                  className="text-gray-400 hover:text-amber-700"
                  aria-label={`Edit ${category.name}`}
                >
                  <EditIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(category)}
                  disabled={isPending}
                  className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-50"
                >
                  {category.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New category name..."
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !newName.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
