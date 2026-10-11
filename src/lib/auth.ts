import { supabase } from "@/lib/supabase";
import { normalizeUsername, usernameToEmail } from "@/lib/username";

export {
  emailToUsername,
  getUsername,
  normalizeUsername,
  usernameToEmail,
  USERNAME_EMAIL_DOMAIN,
  validatePassword,
  validateUsername,
} from "@/lib/username";

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Tên đăng nhập hoặc mật khẩu không đúng.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Tên đăng nhập này đã được sử dụng.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Tài khoản chưa được xác nhận. Hãy tắt xác nhận email trong Supabase.";
  }
  if (normalized.includes("password should be at least")) {
    return "Mật khẩu cần ít nhất 8 ký tự.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Bạn thao tác quá nhanh, vui lòng thử lại sau.";
  }
  if (normalized.includes("signups not allowed")) {
    return "Chức năng đăng ký đang bị tắt trên Supabase.";
  }
  return message;
}

function requireClient() {
  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase.");
  }
  return supabase;
}

/**
 * Registers a new user through the server route (which uses the Supabase Admin
 * API, bypassing the deliverability check that rejects synthetic domains),
 * then signs the new user in.
 */
export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<void> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: normalizeUsername(username),
      password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Không tạo được tài khoản. Vui lòng thử lại.");
  }

  await signInWithUsername(username, password);
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<void> {
  const client = requireClient();

  const { error } = await client.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) throw new Error(translateAuthError(error.message));
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
