"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { LogoutButton } from "@/app/ui/logout-button";
import { SidebarNav } from "@/app/ui/sidebar-nav";
import { navItemsForMenuKeys } from "@/app/ui/sidebar-nav-items";
import { MenuIcon, XIcon } from "@/app/ui/dashboard/icons";
import { useI18n } from "@/app/i18n-provider";

const COLLAPSE_KEY = "cafesync:sidebar-collapsed";
const COLLAPSE_EVENT = "cafesync:sidebar-collapsed-change";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_EVENT, callback);
  };
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

export function SidebarShell({
  subtitle,
  userName,
  userRole,
  avatarUrl,
  visibleMenuKeys,
  extra,
}: {
  subtitle: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  visibleMenuKeys: string[];
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  const navItems = navItemsForMenuKeys(visibleMenuKeys, t);
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#1b140f] px-4 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <CoffeeCupIcon className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm font-bold">
            Cafe<span className="text-amber-400">Sync</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {isCollapsed && (
        <div className="sticky top-0 hidden h-screen w-14 shrink-0 flex-col items-center gap-4 self-start bg-[#1b140f] py-6 text-white lg:flex">
          <button
            type="button"
            onClick={() => writeCollapsed(false)}
            aria-label="Show sidebar"
            title="Show sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <CoffeeCupIcon className="h-5 w-5" />
          </span>
        </div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-[#1b140f] text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:self-start ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:hidden" : "lg:flex"}`}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <CoffeeCupIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold leading-tight">
                Cafe<span className="text-amber-400">Sync</span>
              </p>
              <p className="text-[11px] text-white/50">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 lg:hidden"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => writeCollapsed(true)}
            aria-label="Hide sidebar"
            title="Hide sidebar"
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white lg:flex"
          >
            <MenuIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <nav
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) writeCollapsed(true);
          }}
          className="flex-1 space-y-1 overflow-y-auto px-3"
        >
          <SidebarNav items={navItems} />
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
          >
            {avatarUrl ? (
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                <Image src={avatarUrl} alt="" fill sizes="36px" className="object-cover" />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs text-white/50">{userRole}</p>
            </div>
          </Link>

          {extra}

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
