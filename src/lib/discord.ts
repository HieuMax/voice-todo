/**
 * Optional Discord notifications (new registrations, feedback). Server-only.
 *
 * Set DISCORD_WEBHOOK_URL (Server Settings → Integrations → Webhooks) to enable.
 * When unset, every call is a no-op so the app keeps working without it.
 */

const webhookUrl = () => process.env.DISCORD_WEBHOOK_URL ?? "";

export const isDiscordConfigured = () => Boolean(process.env.DISCORD_WEBHOOK_URL);

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Sends a single embed to the configured webhook. Never throws. */
export async function notifyDiscord(embed: DiscordEmbed): Promise<void> {
  const url = webhookUrl();
  if (!url) {
    console.warn(
      "[discord] DISCORD_WEBHOOK_URL not set — skipped:",
      embed.title,
    );
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Voice Todo",
        embeds: [{ ...embed, timestamp: new Date().toISOString() }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[discord] webhook responded ${response.status}`);
    } else {
      console.info(`[discord] sent: ${embed.title}`);
    }
  } catch (error) {
    console.error("[discord] notify failed:", (error as Error).message);
  }
}

export { truncate };

const ERROR_MIN_INTERVAL_MS = 60_000;
let lastErrorNotifyAt = 0;

/**
 * Rate-limits error notifications so a crashing loop can't spam the channel.
 * Drops extra alerts (logged to the server console) for 60s after the last one.
 */
export function notifyDiscordThrottled(embed: DiscordEmbed): Promise<void> {
  const now = Date.now();
  if (now - lastErrorNotifyAt < ERROR_MIN_INTERVAL_MS) {
    console.warn("[discord] throttled, dropped:", embed.title);
    return Promise.resolve();
  }
  lastErrorNotifyAt = now;
  return notifyDiscord(embed);
}
