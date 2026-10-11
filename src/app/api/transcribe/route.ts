import { NextResponse } from "next/server";

const DEFAULT_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-1";

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
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `Dịch vụ nhận diện lỗi (${response.status}). ${detail}`.trim() },
      { status: 502 },
    );
  }

  const data = (await response.json().catch(() => ({}))) as { text?: string };
  return NextResponse.json({ text: data.text?.trim() ?? "" });
}
