import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/apiAuth";
import { notifyDiscord, truncate } from "@/lib/discord";
import { rateLimit, reserveOnce } from "@/lib/rateLimit";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const DEDUPE_TTL_MS = 60 * 60_000; // same error suppressed for 1 hour
const MAX_BODY_BYTES = 32 * 1024; // 32 KB

/**
 * Collector for uncaught browser errors. The client swaps report() for the
 * browser's error/rejection events and posts here; the server dedupes and
 * forwards a Discord notification.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimit(`error:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return new NextResponse(null, { status: 204 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { message?: unknown; stack?: unknown; url?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const stack = typeof body.stack === "string" ? body.stack : "";
  const url = typeof body.url === "string" ? body.url : "";

  if (!message) {
    return new NextResponse(null, { status: 204 });
  }

  const fingerprint = createHash("sha256")
    .update(`${message}\n${url}`)
    .digest("hex")
    .slice(0, 32);
  const fresh = await reserveOnce(
    `error:dedupe:${fingerprint}:${ip}`,
    DEDUPE_TTL_MS,
  );
  if (!fresh) {
    return new NextResponse(null, { status: 204 });
  }

  await notifyDiscord({
    title: "Lỗi trình duyệt",
    color: 0xef4444,
    description: truncate(message, 1500),
    fields: [
      { name: "URL", value: truncate(url || "-", 500), inline: true },
      { name: "IP", value: ip, inline: true },
      ...(stack
        ? [
            {
              name: "Stack",
              value: truncate(stack, 1000),
              inline: false,
            },
          ]
        : []),
    ],
  });

  return new NextResponse(null, { status: 204 });
}