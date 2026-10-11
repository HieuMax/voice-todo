import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getClientIp, getRequestUser } from "@/lib/apiAuth";
import { notifyDiscord, truncate } from "@/lib/discord";
import {
  FEEDBACK_TYPE_LABELS,
  isFeedbackType,
  validateFeedback,
} from "@/lib/feedback";
import type { FeedbackType } from "@/lib/feedback";
import { rateLimit, reserveOnce } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyTurnstile } from "@/lib/turnstile";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60_000; // 10 minutes
const DEDUPE_TTL_MS = 24 * 60 * 60_000; // 24 hours
const MAX_BODY_BYTES = 16 * 1024; // 16 KB

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Máy chủ chưa cấu hình nơi lưu phản hồi." },
      { status: 503 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Nội dung quá lớn." }, { status: 413 });
  }

  // Feedback is open to guests too; if a session is present we record the owner.
  const user = await getRequestUser(request);
  const ip = getClientIp(request);
  const scope = user ? `user:${user.id}` : `ip:${ip}`;

  const limit = await rateLimit(`feedback:${scope}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều phản hồi. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: {
    type?: unknown;
    message?: unknown;
    contact?: unknown;
    captchaToken?: unknown;
    website?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field (it stays empty -> falsy).
  // Bots that auto-fill every field trigger the drop. Pretend success so bots
  // don't learn they were filtered.
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  const type = typeof body.type === "string" ? body.type : "";
  const message = typeof body.message === "string" ? body.message : "";
  const contact = typeof body.contact === "string" ? body.contact : "";
  const captchaToken =
    typeof body.captchaToken === "string" ? body.captchaToken : "";

  if (!isFeedbackType(type)) {
    return NextResponse.json(
      { error: "Loại phản hồi không hợp lệ." },
      { status: 400 },
    );
  }

  const feedbackType: FeedbackType = type;

  const validationError = validateFeedback({ message, contact });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Xác thực chống spam thất bại. Vui lòng thử lại." },
      { status: 400 },
    );
  }

  // Duplicate suppression: reject the same content from the same user/IP.
  const fingerprint = createHash("sha256")
    .update(`${type}\n${message.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
  const fresh = await reserveOnce(`feedback:dedupe:${scope}:${fingerprint}`, DEDUPE_TTL_MS);
  if (!fresh) {
    return NextResponse.json(
      { error: "Bạn đã gửi nội dung này rồi." },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin.from("feedback").insert([
    {
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      contact: contact.trim() || null,
    },
  ]);

  if (error) {
    console.error("[feedback] insert failed:", error.message);
    return NextResponse.json(
      { error: "Không gửi được phản hồi. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  await notifyDiscord({
    title: `Phản hồi mới: ${FEEDBACK_TYPE_LABELS[feedbackType]}`,
    color: 0x0ea5e9,
    description: truncate(message.trim(), 3800),
    fields: [
      {
        name: "Từ",
        value: user ? `Người dùng ${user.id}` : "Khách",
        inline: true,
      },
      { name: "IP", value: ip, inline: true },
      ...(contact.trim()
        ? [
            {
              name: "Liên hệ",
              value: truncate(contact.trim(), 1000),
              inline: true,
            },
          ]
        : []),
    ],
  });

  return NextResponse.json({ ok: true });
}