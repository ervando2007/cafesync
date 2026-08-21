"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeProductImage, uploadProductImage } from "@/app/master-data/actions";

export function ProductImageUploader({
  productId,
  imageUrl,
}: {
  productId: number;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        setPreview(null);
        return;
      }
      router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeProductImage(productId);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setPreview(null);
      router.refresh();
    });
  }

  const displayUrl = preview ?? imageUrl;

  return (
    <div>
      <label className="text-xs text-gray-500">Product Image</label>
      <div className="mt-1.5 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview URLs can't go through next/image's optimizer
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-300">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isPending ? "Uploading..." : displayUrl ? "Replace" : "Upload"}
            </button>
            {displayUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">JPEG, PNG, or WebP. Max 4MB.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
