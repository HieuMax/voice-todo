import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

const DEFAULT_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-1";

/** Reject uploads larger than this before buffering them into memory. */
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/**
 * Report whether a cloud speech-to-text provider is configured.
 * The client uses this to decide between Whisper and the browser Web Speech API.
 */
export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.WHISPER_API_KEY) });
}

export async function POST(request: Request) {
  const apiKey = process.env.WHISPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Máy chủ chưa cấu hình WHISPER_API_KEY." },
      { status: 501 },
    );
  }

  // Only authenticated users may use the proxy to the paid transcription API.
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để dùng tính năng này." },
      { status: 401 },
    );
  }

  const limit = rateLimit(`transcribe:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Bạn thao tác quá nhanh, vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Tệp âm thanh quá lớn." },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Thiếu dữ liệu âm thanh." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Tệp âm thanh quá lớn." },
      { status: 413 },
    );
  }
  if (audio.type && !audio.type.startsWith("audio/")) {
    return NextResponse.json(
      { error: "Định dạng âm thanh không hợp lệ." },
      { status: 415 },
    );
  }

  const language = typeof form.get("lang") === "string" ? (form.get("lang") as string) : "vi";

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.webm");
  upstream.append("model", process.env.WHISPER_MODEL ?? DEFAULT_MODEL);
  upstream.append("language", language);
  upstream.append("response_format", "json");

  let response: Response;
  try {
    response = await fetch(process.env.WHISPER_API_URL ?? DEFAULT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
  } catch {
    return NextResponse.json(
      { error: "Không kết nối được tới dịch vụ nhận diện giọng nói." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    // Log provider detail server-side only; never leak it to the client.
    const detail = await response.text().catch(() => "");
    console.error(
      `[transcribe] upstream error ${response.status} for user ${user.id}: ${detail}`,
    );
    return NextResponse.json(
      { error: `Dịch vụ nhận diện lỗi (${response.status}).` },
      { status: 502 },
    );
  }

  const data = (await response.json().catch(() => ({}))) as { text?: string };
  return NextResponse.json({ text: data.text?.trim() ?? "" });
}
