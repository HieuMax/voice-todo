"use client";

import { useState, type FormEvent } from "react";

import {
  signInWithUsername,
  signUpWithUsername,
  validatePassword,
  validateUsername,
} from "@/lib/auth";

type Mode = "login" | "register";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        await signInWithUsername(username, password);
      } else {
        await signUpWithUsername(username, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-6">
      <div className="w-full rounded-3xl border border-white bg-white/90 p-6 shadow-xl shadow-indigo-100 backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
              <path
                d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 11a7 7 0 0014 0M12 18v3M8.5 21h7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Voice Todo</h1>
          <p className="text-sm text-slate-400">
            {mode === "login" ? "Đăng nhập để xem danh sách của bạn" : "Tạo tài khoản mới"}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={`rounded-lg py-2 transition ${
                mode === value
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {value === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-600">
              Tên đăng nhập
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              inputMode="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ví dụ: hieu_123"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-600">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ít nhất 6 ký tự"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          Mật khẩu được Supabase mã hóa an toàn. Mỗi tài khoản chỉ thấy công việc của mình.
        </p>
      </div>
    </div>
  );
}
