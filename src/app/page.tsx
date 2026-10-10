"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TodoList from "@/components/TodoList";
import VoiceButton from "@/components/VoiceButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  createTodo,
  deleteTodo as removeTodo,
  fetchTodos,
  setTodoCompleted,
} from "@/lib/todos";
import { parseVoiceCommand } from "@/lib/todoParser";
import type { Todo } from "@/types/todo";

interface Notice {
  kind: "success" | "error" | "info";
  text: string;
}

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((next: Notice) => {
    setNotice(next);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const markBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    fetchTodos()
      .then((items) => {
        if (active) setTodos(items);
      })
      .catch((error: unknown) => {
        if (active) {
          showNotice({
            kind: "error",
            text: `Không tải được danh sách: ${(error as Error).message}`,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showNotice]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleTranscript = useCallback(
    async (text: string) => {
      const { task, time } = parseVoiceCommand(text);

      try {
        const created = await createTodo({ task, reminder_time: time });
        setTodos((prev) => [created, ...prev]);
        showNotice({
          kind: "success",
          text: time ? `Đã thêm "${task}" lúc ${time}` : `Đã thêm "${task}"`,
        });
      } catch (error) {
        showNotice({
          kind: "error",
          text: `Không lưu được công việc: ${(error as Error).message}`,
        });
      }
    },
    [showNotice],
  );

  const { isSupported, isListening, start } = useSpeechRecognition({
    onResult: handleTranscript,
    onError: (message) => showNotice({ kind: "error", text: message }),
  });

  const handleToggle = useCallback(
    async (todo: Todo) => {
      const nextValue = !todo.is_completed;
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, is_completed: nextValue } : item,
        ),
      );
      markBusy(todo.id, true);

      try {
        await setTodoCompleted(todo.id, nextValue);
      } catch (err) {
        setTodos((prev) =>
          prev.map((item) =>
            item.id === todo.id ? { ...item, is_completed: !nextValue } : item,
          ),
        );
        showNotice({ kind: "error", text: (err as Error).message });
      } finally {
        markBusy(todo.id, false);
      }
    },
    [markBusy, showNotice],
  );

  const handleDelete = useCallback(
    async (todo: Todo) => {
      const snapshot = todos;
      setTodos((prev) => prev.filter((item) => item.id !== todo.id));

      try {
        await removeTodo(todo.id);
        showNotice({ kind: "info", text: "Đã xóa công việc" });
      } catch (err) {
        setTodos(snapshot);
        showNotice({ kind: "error", text: (err as Error).message });
      }
    },
    [showNotice, todos],
  );

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.is_completed).length,
    [todos],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Voice Todo
          </h1>
          <span className="text-sm font-medium text-slate-400">
            {remaining} việc cần làm
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Nói để thêm công việc, ví dụ: &ldquo;Nhắc tôi họp lúc 9 giờ sáng&rdquo;
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mx-5 mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Chế độ demo: dữ liệu lưu trên thiết bị. Cấu hình Supabase để đồng bộ.
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`mx-5 mt-4 rounded-xl px-3 py-2 text-sm ${
            notice.kind === "error"
              ? "bg-rose-50 text-rose-600"
              : notice.kind === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      <main className="flex-1 px-5 pt-5 pb-40">
        <TodoList
          todos={todos}
          loading={loading}
          busyIds={busyIds}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </main>

      <VoiceButton isListening={isListening} isSupported={isSupported} onClick={start} />
    </div>
  );
}
