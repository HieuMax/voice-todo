import type { Instrumentation } from "next";

import { isDiscordConfigured, notifyDiscordThrottled, truncate } from "@/lib/discord";

/** Logs at server startup whether Discord notifications are enabled. */
export function register(): void {
  console.info(
    isDiscordConfigured()
      ? "[discord] webhook notifications enabled"
      : "[discord] DISCORD_WEBHOOK_URL not set — bug/registration/feedback alerts disabled",
  );
}

/**
 * Reports uncaught server errors (route handlers, server components, server
 * actions) to the configured Discord webhook so the owner gets alerted about
 * bugs instead of only about user feedback / registrations.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const message = err instanceof Error ? err.message : String(err);
  const digest =
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof err.digest === "string"
      ? err.digest
      : undefined;

  await notifyDiscordThrottled({
    title: "Lỗi máy chủ",
    color: 0xef4444,
    description:
      truncate(message, 1500) + (digest ? `\n\`${digest}\`` : ""),
    fields: [
      {
        name: "Đường dẫn",
        value: truncate(request.path || "/", 500),
        inline: true,
      },
      {
        name: "Phương thức",
        value: request.method || "GET",
        inline: true,
      },
      {
        name: "Route file",
        value: truncate(context.routePath || "-", 500),
        inline: true,
      },
      {
        name: "Loại",
        value: context.routeType || "render",
        inline: true,
      },
    ],
  });
};