/**
 * Microphone permission helpers.
 *
 * Once a user blocks the mic, browsers silently reject every later
 * `getUserMedia` call and never prompt again. We can't re-trigger the browser
 * prompt from code, so we detect the blocked state and tell the user to
 * re-enable the mic in their browser settings.
 */

export type MicrophonePermissionState = "granted" | "denied" | "prompt" | "unknown";

export const MICROPHONE_BLOCKED_MESSAGE =
  "Micro đang bị chặn. Mở Hướng dẫn sử dụng (nút ? ở góc dưới) để xem cách bật lại quyền micro trên điện thoại.";

export const MICROPHONE_ERROR_MESSAGE =
  "Không truy cập được micro. Vui lòng kiểm tra quyền.";

export type MicrophonePlatform = "ios" | "android" | "desktop";

/**
 * Guess the platform so the mic guide can show the right "re-enable" steps.
 * Mobile browsers hide the origin settings behind different controls (the "aA"
 * menu on iOS Safari, the ⋮ menu on Android Chrome), so the desktop lock-icon
 * instructions don't apply.
 */
export function detectMicrophonePlatform(): MicrophonePlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const touchMac =
    /Macintosh/.test(ua) &&
    typeof document !== "undefined" &&
    "ontouchend" in document;
  if (/iPad|iPhone|iPod/.test(ua) || touchMac) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** True when an error means the mic is blocked (not a transient failure). */
export function isMicrophoneDeniedError(error: unknown): boolean {
  const name =
    error instanceof DOMException
      ? error.name
      : (error as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError";
}

/** Read the current microphone permission without triggering a prompt. */
export async function getMicrophonePermissionState(): Promise<MicrophonePermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
