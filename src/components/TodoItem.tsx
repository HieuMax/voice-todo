"use client";

import type { Todo } from "@/types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  busy?: boolean;
}

export default function TodoItem({ todo, onToggle, onDelete, busy }: TodoItemProps) {
  return (
    <li className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition active:scale-[0.99]">
      <button
        type="button"
        aria-label={todo.is_completed ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
        onClick={() => onToggle(todo)}
        disabled={busy}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
          todo.is_completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 text-transparent hover:border-emerald-400"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path
            d="M5 10.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[15px] leading-6 ${
            todo.is_completed ? "text-slate-400 line-through" : "text-slate-800"
          }`}
        >
          {todo.task}
        </p>
        {todo.reminder_time && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
            <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {todo.reminder_time}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Xóa công việc"
        onClick={() => onDelete(todo)}
        disabled={busy}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6 0l.6 9.1A1.5 1.5 0 008.1 16.5h3.8a1.5 1.5 0 001.5-1.4L14 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}
