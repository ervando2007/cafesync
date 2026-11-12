"use client";

import { useEffect } from "react";
import { getSession, signOut, useSession } from "next-auth/react";
import { SESSION_IDLE_SECONDS } from "@/lib/session-config";

const IDLE_MS = SESSION_IDLE_SECONDS * 1000;
// How often (at most) user activity re-issues the session cookie, so an
// active user isn't logged out by the server-side maxAge.
const KEEPALIVE_MS = 2 * 60 * 1000;
const CHECK_MS = 15 * 1000;
// Shared across tabs so activity in one tab keeps the others alive too.
const STORAGE_KEY = "cafesync:last-activity";
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

function readLastActivity(fallback: number): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? Math.max(value, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function writeLastActivity(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage blocked — per-tab tracking still works.
  }
}

/**
 * Signs the user out after SESSION_IDLE_SECONDS without any interaction,
 * and keeps the server session alive while the user is active.
 */
export function IdleLogout() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let lastActivity = Date.now();
    let lastKeepAlive = Date.now();
    let lastWrite = 0;
    let signingOut = false;
    writeLastActivity(lastActivity);

    const onActivity = () => {
      const now = Date.now();
      lastActivity = now;
      // Throttle localStorage writes; mousemove fires constantly.
      if (now - lastWrite > 5000) {
        lastWrite = now;
        writeLastActivity(now);
      }
      if (now - lastKeepAlive > KEEPALIVE_MS) {
        lastKeepAlive = now;
        void getSession(); // re-issues the JWT cookie with a fresh maxAge
      }
    };

    const check = () => {
      if (signingOut) return;
      lastActivity = readLastActivity(lastActivity);
      if (Date.now() - lastActivity >= IDLE_MS) {
        signingOut = true;
        void signOut({ callbackUrl: "/" });
      }
    };

    // Background tabs throttle timers, so also check when the tab returns.
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(check, CHECK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [status]);

  return null;
}
