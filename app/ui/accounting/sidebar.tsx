"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CoffeeCupIcon } from "@/app/ui/icons";
import { LogoutButton } from "@/app/ui/logout-button";
import { SidebarNav } from "@/app/ui/sidebar-nav";
import { navItemsForMenuKeys } from "@/app/ui/sidebar-nav-items";
import { MenuIcon, XIcon } from "@/app/ui/dashboard/icons";

export function AccountingSidebar({
  userName,
  userRole,
  visibleMenuKeys,
}: {
  userName: string;
  userRole: string;
  visibleMenuKeys: string[];
}) {
  const navItems = navItemsForMenuKeys(visibleMenuKeys);
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-[#1b140f] text-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:flex lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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
              <p className="text-[11px] text-white/50">Accounting</p>
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
          <MenuIcon className="hidden h-4.5 w-4.5 text-white/50 lg:block" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <SidebarNav items={navItems} />
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs text-white/50">{userRole}</p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
