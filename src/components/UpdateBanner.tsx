"use client";

import { useAppUpdate } from "@/hooks/useAppUpdate";

/**
 * Small, non-blocking banner shown when a new deployment is detected while the
 * app is in use. Resumed apps reload on their own, so this only appears for the
 * foreground case.
 */
export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-30 flex justify-center px-5">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900/95 py-1.5 pr-1.5 pl-4 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 backdrop-blur">
        <span>Đã có bản cập nhật mới</span>
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-400 active:scale-95"
        >
          Cập nhật
        </button>
      </div>
    </div>
  );
}
