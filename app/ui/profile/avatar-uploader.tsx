"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { removeProfilePhoto, uploadProfilePhoto } from "@/app/profile/actions";
import { useI18n } from "@/app/i18n-provider";

export function AvatarUploader({
  initialAvatarUrl,
  initial,
}: {
  initialAvatarUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
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
      const result = await uploadProfilePhoto(formData);
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        setPreview(null);
        return;
      }
      await update({});
      router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeProfilePhoto();
      if (!result.ok) {
        setError(result.message ?? t("common.somethingWentWrong"));
        return;
      }
      setAvatarUrl(null);
      setPreview(null);
      await update({});
      router.refresh();
    });
  }

  const displayUrl = preview ?? avatarUrl;

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-amber-600 text-2xl font-semibold text-white">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: preview URLs can't go through next/image's optimizer
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
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
            {isPending ? t("masterData.uploading") : displayUrl ? t("profile.replacePhoto") : t("profile.uploadPhoto")}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              {t("common.remove")}
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400">{t("masterData.imageHint")}</p>
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
  );
}
