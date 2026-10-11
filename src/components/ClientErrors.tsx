"use client";

import { useEffect } from "react";

/**
 * Hooks uncaught browser errors / rejected promises and forwards them to
 * /api/error, which notifies the owner's Discord webhook.
 */
export default function ClientErrors() {
  useEffect(() => {
    function report(message: string, stack: string, url: string) {
      fetch("/api/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          stack: stack.slice(0, 2000),
          url,
        }),
      }).catch(() => {
        // Never cascade into another error report.
      });
    }

    const handleError = (event: ErrorEvent) => {
      report(
        event.message,
        event.error instanceof Error ? event.error.stack ?? "" : "",
        location.href,
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report(
        reason instanceof Error ? reason.message : String(reason),
        reason instanceof Error ? reason.stack ?? "" : "",
        location.href,
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}