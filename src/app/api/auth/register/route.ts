import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/apiAuth";
import { notifyDiscord } from "@/lib/discord";
import { rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from "@/lib/username";

/** Max registrations allowed per IP within the window. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60_000; // 10 minutes

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        error:
          "Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY. Vui lòng thêm biến môi trường này.",
      },
      { status: 500 },
    );
  }

  const ip = getClientIp(request);
  const limit = await rateLimit(`register:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const usernameError = validateUsername(username);
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const normalized = normalizeUsername(username);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToEmail(normalized),
    password,
    email_confirm: true,
    user_metadata: { username: normalized },
  });

  if (error) {
    const message = error.message.toLowerCase();
    const alreadyExists =
      message.includes("already") || message.includes("exists") || error.status === 422;

    return NextResponse.json(
      {
        error: alreadyExists
          ? "Tên đăng nhập này đã được sử dụng."
          : "Không tạo được tài khoản. Vui lòng thử lại.",
      },
      { status: 400 },
    );
  }

  await notifyDiscord({
    title: "Người dùng mới đăng ký",
    color: 0x6366f1,
    fields: [
      { name: "Tên đăng nhập", value: normalized, inline: true },
      { name: "User ID", value: data.user?.id ?? "không rõ", inline: true },
      { name: "IP", value: ip, inline: true },
    ],
  });

  return NextResponse.json({ ok: true });
}
