"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import Turnstile, { TURNSTILE_SITE_KEY } from "@/components/Turnstile";
import {
  FEEDBACK_CONTACT_MAX,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  validateFeedback,
  type FeedbackType,
} from "@/lib/feedback";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "submitting" | "sent";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const reset = useCallback(() => {
    setType("bug");
    setMessage("");
    setContact("");
    setCaptchaToken("");
    setWebsite("");
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateFeedback({ message, contact });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Vui lòng xác nhận bạn không phải robot.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type,
          message,
          contact,
          captchaToken,
          website,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Không gửi được phản hồi. Vui lòng thử lại.");
      }

      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError((err as Error).message);
    }
  }

  function handleClose() {
    close();
    if (status === "sent") reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Gửi phản hồi hoặc báo lỗi"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur transition hover:border-indigo-200 hover:text-indigo-600 active:scale-95"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gửi phản hồi"
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-white bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            {status === "sent" ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-base font-semibold text-slate-800">
                  Cảm ơn bạn đã góp ý!
                </p>
                <p className="text-sm text-slate-400">
                  Phản hồi của bạn đã được gửi. Chúng tôi sẽ xem xét sớm nhất có thể.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-1 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      Gửi phản hồi
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-400">
                      Báo lỗi hoặc đề xuất để chúng tôi cải thiện.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Đóng"
                    className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
                  {FEEDBACK_TYPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`rounded-lg py-2 transition ${
                        type === value
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {FEEDBACK_TYPE_LABELS[value]}
                    </button>
                  ))}
                </div>

                {/* Honeypot: hidden from users, tempting to bots. */}
                <div
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
                >
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </label>
                </div>

                <label className="mt-4 block text-xs font-medium text-slate-500">
                  Nội dung
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={5}
                    maxLength={FEEDBACK_MESSAGE_MAX}
                    placeholder="Mô tả điều bạn gặp phải hoặc mong muốn..."
                    className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="mt-3 block text-xs font-medium text-slate-500">
                  Liên hệ (không bắt buộc)
                  <input
                    type="text"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    maxLength={FEEDBACK_CONTACT_MAX}
                    autoComplete="email"
                    placeholder="Email hoặc số điện thoại để phản hồi lại"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <Turnstile onVerify={handleVerify} />

                {error && (
                  <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {status === "submitting" ? "Đang gửi..." : "Gửi phản hồi"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
