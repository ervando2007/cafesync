"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "cafesync:wishlist";

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readWishlistIds(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

let cachedRaw: string | null = null;
let cachedSnapshot = new Set<number>();

function getSnapshot(): Set<number> {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = new Set(readWishlistIds());
  }
  return cachedSnapshot;
}

function getServerSnapshot(): Set<number> {
  return cachedSnapshot;
}

export function useWishlist() {
  const wishlist = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((productId: number) => {
    const next = new Set(readWishlistIds());
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    emitChange();
  }, []);

  return { wishlist, toggle };
}
