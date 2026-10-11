import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface AuthedUser {
  id: string;
  email?: string;
}

/**
 * Resolve the caller from a Supabase access token supplied as a Bearer token.
 * Returns null when the token is missing, malformed, or invalid. Server-only.
 */
export async function getRequestUser(request: Request): Promise<AuthedUser | null> {
  if (!supabaseAdmin) return null;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** Best-effort client IP, honoring common reverse-proxy headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
