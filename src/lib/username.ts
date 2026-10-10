import type { User } from "@supabase/supabase-js";

/**
 * Usernames are mapped to a synthetic email because Supabase Auth identifies
 * users by email. The domain only needs to be a valid, non-reserved domain;
 * accounts are created through the Admin API so no mail is ever sent to it.
 */
export const USERNAME_EMAIL_DOMAIN = "voicetodo.app";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | undefined | null): string | null {
  if (!email) return null;
  const [name] = email.split("@");
  return name || null;
}

export function getUsername(user: User | null): string | null {
  if (!user) return null;
  const metadataName =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null;
  return metadataName ?? emailToUsername(user.email);
}

export function validateUsername(username: string): string | null {
  const value = normalizeUsername(username);
  if (!value) return "Vui lòng nhập tên đăng nhập.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Tên đăng nhập gồm 3-20 ký tự, chỉ dùng chữ thường, số và dấu gạch dưới.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (password.length < 6) return "Mật khẩu cần ít nhất 6 ký tự.";
  return null;
}
