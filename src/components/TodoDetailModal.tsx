"use client";

import { useEffect } from "react";

import type { Todo } from "@/types/todo";

interface TodoDetailModalProps {
  todo: Todo;
  onClose: () => void;
}

function formatCreated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function TodoDetailModal({ todo, onClose }: TodoDetailModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết công việc"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-white bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              todo.is_completed
                ? "bg-emerald-50 text-emerald-600"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            {todo.is_completed ? "Đã xong" : "Cần làm"}
          </span>
          <button
            type="button"
            onClick={onClose}
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

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-800">
            {todo.task}
          </p>
        </div>

        <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          {todo.reminder_time && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Giờ nhắc</dt>
              <dd className="font-medium text-slate-700">{todo.reminder_time}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Tạo lúc</dt>
            <dd className="text-slate-500">{formatCreated(todo.created_at)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
