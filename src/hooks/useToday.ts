"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Current date formatted for Vietnamese (e.g. "Thứ Hai, 11/10/2026").
 * Uses an external store so the server renders an empty string and the client
 * fills in the local date without a hydration mismatch.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
