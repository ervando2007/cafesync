"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "@/app/ui/icons";

type IconComponent = ComponentType<{ className?: string }>;

export interface SidebarNavLeaf {
  label: string;
  icon: IconComponent;
  href: string;
}

export interface SidebarNavParent {
  label: string;
  icon: IconComponent;
  children: { label: string; href: string }[];
}

export type SidebarNavItem = SidebarNavLeaf | SidebarNavParent;

const activeClass = "flex items-center gap-3 rounded-lg bg-amber-700 px-3 py-2.5 text-white";
const inactiveClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-white/60 hover:bg-white/5 hover:text-white/80";

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  const [openLabel, setOpenLabel] = useState<string | null>(() => {
    const activeParent = items.find(
      (item) => "children" in item && item.children.some((c) => pathname.startsWith(c.href)),
    );
    return activeParent?.label ?? null;
  });

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;

        if ("href" in item) {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.label} href={item.href} className={isActive ? activeClass : inactiveClass}>
              <Icon className="h-4.5 w-4.5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        }

        const hasActiveChild = item.children.some((c) => pathname.startsWith(c.href));
        const isOpen = openLabel === item.label;

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => setOpenLabel(isOpen ? null : item.label)}
              className={`w-full ${hasActiveChild ? activeClass : inactiveClass}`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="mt-1 space-y-1 border-l border-white/10 pl-4">
                {item.children.map((child) => {
                  const isChildActive = pathname.startsWith(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                        isChildActive
                          ? "bg-amber-700 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
