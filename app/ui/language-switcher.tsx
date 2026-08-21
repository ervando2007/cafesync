"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n-provider";
import { setLocale } from "@/lib/i18n/actions";
import { ChevronDownIcon, GlobeIcon } from "@/app/ui/icons";
import type { Locale } from "@/lib/i18n/translate";

const LANGUAGES: { value: Locale; labelKey: "login.languageEnglish" | "login.languageIndonesian" }[] = [
  { value: "en", labelKey: "login.languageEnglish" },
  { value: "id", labelKey: "login.languageIndonesian" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentLabel = LANGUAGES.find((l) => l.value === locale)?.labelKey ?? "login.languageEnglish";

  async function handleSelect(value: Locale) {
    setIsOpen(false);
    if (value === locale) return;
    setIsPending(true);
    await setLocale(value);
    router.refresh();
    setIsPending(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
      >
        <GlobeIcon className="h-4 w-4" />
        {t(currentLabel)}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => handleSelect(lang.value)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                lang.value === locale ? "font-semibold text-amber-700" : "text-gray-700"
              }`}
            >
              {t(lang.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
