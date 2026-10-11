"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { APP_VERSION } from "@/lib/appVersion";

/** How often to poll for a new deployment while the app stays open. */
const CHECK_INTERVAL_MS = 5 * 60_000;

/** A background gap longer than this counts as "resumed" (vs. a quick switch). */
const RESUME_THRESHOLD_MS = 15_000;

/** Set after an automatic reload so a stale HTML cache can't cause a loop. */
const RELOAD_GUARD_KEY = "voicetodo.update.reload-attempted";

interface AppUpdate {
  updateAvailable: boolean;
  applyUpdate: () => void;
}

/**
 * Detects a new deployment by comparing the running build's version with the
 * server's. When the app is resumed from the background (the common PWA case)
 * it reloads automatically; while the app stays in the foreground it only sets
 * a flag so the UI can offer a non-blocking "update" banner. Reloading is
 * guarded so a cached document can never trap the app in a reload loop.
 *
 * Disabled in development, where HMR already handles updates.
 */
export function useAppUpdate(): AppUpdate {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    let stopped = false;
    let checking = false;
    let resumeReload = false;

    const autoReload = (version: string) => {
      let attempted: string | null = null;
      try {
        attempted = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
      } catch {
        attempted = null;
      }
      if (attempted === version) {
        // A reload already ran for this version without picking it up (likely a
        // cached document). Stop looping and fall back to the banner.
        setUpdateAvailable(true);
        return;
      }
      try {
        window.sessionStorage.setItem(RELOAD_GUARD_KEY, version);
      } catch {
        // Private mode: reload anyway, the guard just won't persist.
      }
      window.location.reload();
    };

    const check = async () => {
      if (stopped || checking) return;
      checking = true;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { version?: string };
        const serverVersion = data.version;
        if (!serverVersion || serverVersion === APP_VERSION) {
          try {
            window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
          } catch {
            // ignore
          }
          setUpdateAvailable(false);
          return;
        }

        if (resumeReload) {
          resumeReload = false;
          autoReload(serverVersion);
        } else {
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or a transient failure; the next check will retry.
      } finally {
        checking = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      resumeReload = hiddenFor >= RESUME_THRESHOLD_MS;
      void check();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resumeReload = true;
      void check();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", onPageShow);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    void check();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return { updateAvailable, applyUpdate };
}
