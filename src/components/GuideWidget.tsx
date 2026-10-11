"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { detectMicrophonePlatform, type MicrophonePlatform } from "@/lib/microphone";

const GUIDE_SEEN_KEY = "voicetodo.guide.seen";

const STEPS = [
  {
    title: "Mở micro",
    text: 'Nhấn nút micro tròn ở giữa dưới màn hình và chọn "Cho phép" khi trình duyệt hỏi quyền truy cập micro.',
  },
  {
    title: "Nói công việc",
    text: 'Nói rõ việc cần làm kèm thời gian. Ví dụ: "Nhắc tôi mua sữa lúc 8 giờ sáng".',
  },
  {
    title: "Kiểm tra và lưu",
    text: 'Xem lại nội dung và giờ nhắc, chỉnh lại nếu cần rồi nhấn "Xác nhận".',
  },
  {
    title: "Quản lý danh sách",
    text: "Chạm vào công việc để xem chi tiết, đánh dấu hoàn thành hoặc xóa.",
  },
];

const SPLIT_KEYWORDS = ["việc là", "công việc là", "tiếp theo", "tiếp đến"];
const SPLIT_KEYWORDS_MORE = ["task là", "new", "continue", "ok"];

const SPLIT_EXAMPLES = [
  "Mua sữa lúc 8 giờ sáng, tiếp theo gọi mẹ lúc 7 giờ tối",
  "Việc là mua sữa, việc là đi chợ lúc 5 giờ chiều",
];

const MIC_MANUAL_STEPS: Record<MicrophonePlatform, string[]> = {
  ios: [
    "Mở ứng dụng Cài đặt (Settings) trên iPhone.",
    'Vào Safari → mục "Micro" (hoặc "Camera & Microphone").',
    'Chọn "Hỏi" (Ask) hoặc "Cho phép".',
  ],
  android: [
    "Nhấn nút ⋮ (ba chấm) ở góc phải thanh địa chỉ Chrome.",
    'Chọn "Cài đặt trang web" rồi tới mục "Micro".',
    'Chọn "Cho phép" (Allow).',
  ],
  desktop: [
    "Nhấn biểu tượng ổ khóa ở bên trái thanh địa chỉ.",
    'Chọn Micro rồi đặt thành "Cho phép".',
  ],
};

function hasSeenGuide(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markGuideSeen(): void {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    // Storage may be unavailable (private mode); ignore.
  }
}

function subscribePlatform(): () => void {
  return () => {};
}

function getServerPlatform(): MicrophonePlatform {
  return "desktop";
}

export default function GuideWidget() {
  const [open, setOpen] = useState(false);
  const platform = useSyncExternalStore(
    subscribePlatform,
    detectMicrophonePlatform,
    getServerPlatform,
  );

  useEffect(() => {
    if (hasSeenGuide()) return;
    markGuideSeen();
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const reload = useCallback(() => window.location.reload(), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hướng dẫn sử dụng"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur transition hover:border-indigo-200 hover:text-indigo-600 active:scale-95"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M9.6 9.2a2.4 2.4 0 013.9-1.9c1.3 1 .7 2.6-.6 3.2-.7.3-1.1.9-1.1 1.6v.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn sử dụng"
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="max-h-[88vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-white bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Cách dùng Voice Todo
                </h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  Tạo công việc bằng giọng nói chỉ trong vài giây.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
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

            <ol className="mt-4 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-xl bg-indigo-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-indigo-700">
                Nói nhiều việc cùng lúc
              </p>
              <p className="mt-0.5 text-sm text-indigo-600/90">
                Để tách thành nhiều việc, nói một trong các từ khóa này trước mỗi
                việc:
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {SPLIT_KEYWORDS.map((keyword) => (
                  <li
                    key={keyword}
                    className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-indigo-700 shadow-sm"
                  >
                    &ldquo;{keyword}&rdquo;
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-indigo-600/90">
                Cũng nhận: {SPLIT_KEYWORDS_MORE.map((k) => `"${k}"`).join(", ")}. Nói
                liền bằng dấu phẩy thôi sẽ tính là một việc.
              </p>
              <ul className="mt-2 space-y-1.5">
                {SPLIT_EXAMPLES.map((example) => (
                  <li
                    key={example}
                    className="rounded-lg bg-white/70 px-2.5 py-1.5 text-sm italic text-indigo-700"
                  >
                    &ldquo;{example}&rdquo;
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-indigo-600/90">
                Mỗi việc hiện thành một dòng để bạn sửa hoặc nói lại, rồi chọn{" "}
                <span className="font-semibold">&ldquo;Xác nhận tất cả&rdquo;</span>.
              </p>
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <p className="font-semibold">Micro đang bị chặn?</p>
              <p className="mt-0.5 text-amber-700">
                Cách nhanh nhất: tải lại trang, rồi nhấn nút micro và chọn{" "}
                &ldquo;Cho phép&rdquo;. Trên iPhone/Safari, tải lại là đủ để hỏi lại
                quyền.
              </p>
              <button
                type="button"
                onClick={reload}
                className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 active:scale-[0.99]"
              >
                Tải lại trang
              </button>

              <p className="mt-3 font-medium">Nếu vẫn không hiện thông báo, bật thủ công:</p>
              <ol className="mt-2 space-y-2">
                {MIC_MANUAL_STEPS[platform].map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-xs font-bold text-amber-800">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-amber-700/80">
                Nếu đang mở trong app khác (Facebook, Zalo...), hãy mở bằng Chrome
                hoặc Safari.
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
