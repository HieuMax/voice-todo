"use client";

import TodoItem from "@/components/TodoItem";
import type { Todo } from "@/types/todo";

interface TodoListProps {
  todos: Todo[];
  loading: boolean;
  busyIds: Set<string>;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export default function TodoList({
  todos,
  loading,
  busyIds,
  onToggle,
  onDelete,
}: TodoListProps) {
  if (loading) {
    return (
      <ul className="space-y-3">
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="h-[68px] animate-pulse rounded-2xl border border-slate-100 bg-white/70"
          />
        ))}
      </ul>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden>
            <path
              d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M5 11a7 7 0 0014 0M12 18v3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-base font-medium text-slate-600">Chưa có công việc nào</p>
        <p className="max-w-[16rem] text-sm text-slate-400">
          Nhấn nút micro và nói, ví dụ: &ldquo;Nhắc tôi mua sữa lúc 8 giờ sáng&rdquo;
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          busy={busyIds.has(todo.id)}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
