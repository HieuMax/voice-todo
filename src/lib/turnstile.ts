/**
 * Cloudflare Turnstile verification (server-side). Enabled only when
 * TURNSTILE_SECRET_KEY is configured; otherwise tokens are not required and the
 * check is skipped (log a warning in production if you rely on it).
 */

const secret = process.env.TURNSTILE_SECRET_KEY;
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

if (Boolean(secret) !== Boolean(siteKey)) {
  console.warn(
    "[turnstile] Set BOTH NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to enable CAPTCHA. Currently disabled.",
  );
}

/** CAPTCHA is enforced only when both keys are present. */
export const isTurnstileConfigured = Boolean(secret && siteKey);

export async function verifyTurnstile(
  token: string,
  remoteIp: string,
): Promise<boolean> {
  if (!secret || !siteKey) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}
