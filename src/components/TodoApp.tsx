"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TaskListEditor, { type PendingTask } from "@/components/TaskListEditor";
import TodoList from "@/components/TodoList";
import TranscriptEditor from "@/components/TranscriptEditor";
import VoiceButton from "@/components/VoiceButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToday } from "@/hooks/useToday";
import { useWhisperRecognition } from "@/hooks/useWhisperRecognition";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createId } from "@/lib/id";
import {
  clearTodos,
  createTodo,
  deleteTodo as removeTodo,
  fetchTodos,
  setTodoCompleted,
} from "@/lib/todos";
import {
  hasTaskPrefix,
  parseVoiceCommand,
  pickBestTranscript,
  splitVoiceTasks,
  stripTaskPrefix,
} from "@/lib/todoParser";
import type { Todo } from "@/types/todo";

interface TodoAppProps {
  userId: string | null;
  username: string | null;
  onSignOut?: () => void;
}

interface Notice {
  kind: "success" | "error" | "info";
  text: string;
}

interface PendingTodo {
  raw: string;
  task: string;
  time: string;
}

export default function TodoApp({ userId, username, onSignOut }: TodoAppProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingTodo | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[] | null>(null);
  const [recordingRowId, setRecordingRowId] = useState<string | null>(null);
  const [whisperEnabled, setWhisperEnabled] = useState(false);
  const voiceTargetRef = useRef<string | "new">("new");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = useToday();

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

    fetchTodos(userId)
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
  }, [showNotice, userId]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/transcribe")
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => {
        if (active) setWhisperEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        // Cloud STT is optional; fall back to the browser engine.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleVoiceResult = useCallback(
    (transcript: string, alternatives: string[]) => {
      const best = alternatives.length > 1 ? pickBestTranscript(alternatives) : transcript;
      const target = voiceTargetRef.current;

      if (target !== "new") {
        voiceTargetRef.current = "new";
        setRecordingRowId(null);
        const { task, time } = parseVoiceCommand(stripTaskPrefix(best));
        setPendingTasks((prev) =>
          prev
            ? prev.map((item) =>
                item.id === target
                  ? {
                      ...item,
                      raw: best,
                      task: task === "Việc cần làm" ? "" : task,
                      time: time ?? "",
                    }
                  : item,
              )
            : prev,
        );
        return;
      }

      if (hasTaskPrefix(best)) {
        const items = splitVoiceTasks(best).map((item) => ({
          id: createId(),
          raw: item.raw,
          task: item.task,
          time: item.time ?? "",
        }));
        if (items.length > 0) {
          setPending(null);
          setPendingTasks(items);
          return;
        }
      }

      const { task, time } = parseVoiceCommand(best);
      setPendingTasks(null);
      setPending({
        raw: best,
        task: task === "Việc cần làm" ? "" : task,
        time: time ?? "",
      });
    },
    [],
  );

  const handleVoiceError = useCallback(
    (message: string) => {
      voiceTargetRef.current = "new";
      setRecordingRowId(null);
      showNotice({ kind: "error", text: message });
    },
    [showNotice],
  );

  const savePending = useCallback(async () => {
    if (!pending) return;
    const task = pending.task.trim() || "Việc cần làm";
    const time = pending.time.trim() || null;
    setPending(null);

    try {
      const created = await createTodo({ task, reminder_time: time }, userId);
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
  }, [pending, showNotice, userId]);

  const updatePendingTask = useCallback(
    (id: string, patch: Partial<Pick<PendingTask, "task" | "time">>) => {
      setPendingTasks((prev) =>
        prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : prev,
      );
    },
    [],
  );

  const removePendingTask = useCallback((id: string) => {
    setPendingTasks((prev) => {
      if (!prev) return prev;
      const remaining = prev.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : null;
    });
  }, []);

  const cancelPendingTasks = useCallback(() => setPendingTasks(null), []);

  const confirmPendingTasks = useCallback(async () => {
    if (!pendingTasks) return;

    const inputs = pendingTasks
      .map((item) => ({ task: item.task.trim(), reminder_time: item.time.trim() || null }))
      .filter((item) => item.task);

    setPendingTasks(null);
    if (inputs.length === 0) return;

    try {
      const created = await Promise.all(inputs.map((input) => createTodo(input, userId)));
      setTodos((prev) => [...created, ...prev]);
      showNotice({ kind: "success", text: `Đã thêm ${created.length} công việc` });
    } catch (error) {
      showNotice({
        kind: "error",
        text: `Không lưu được công việc: ${(error as Error).message}`,
      });
    }
  }, [pendingTasks, showNotice, userId]);

  const speech = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const whisper = useWhisperRecognition({
    enabled: whisperEnabled,
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const useWhisper = whisperEnabled && whisper.isSupported;
  const isSupported = useWhisper ? whisper.isSupported : speech.isSupported;
  const isListening = useWhisper ? whisper.isListening : speech.isListening;
  const isProcessing = useWhisper ? whisper.isProcessing : false;

  const startVoiceFor = useCallback(
    (target: string | "new") => {
      voiceTargetRef.current = target;
      if (useWhisper) whisper.start();
      else speech.start();
    },
    [speech, useWhisper, whisper],
  );

  const stopVoice = useCallback(() => {
    if (useWhisper) whisper.stop();
    else speech.stop();
  }, [speech, useWhisper, whisper]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) stopVoice();
    else startVoiceFor("new");
  }, [isListening, startVoiceFor, stopVoice]);

  const handleRowRecord = useCallback(
    (id: string) => {
      if (isListening && recordingRowId === id) {
        stopVoice();
        return;
      }
      setRecordingRowId(id);
      startVoiceFor(id);
    },
    [isListening, recordingRowId, startVoiceFor, stopVoice],
  );

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

  const handleClearAll = useCallback(async () => {
    if (todos.length === 0) return;
    if (!window.confirm("Xóa tất cả công việc?")) return;

    const snapshot = todos;
    setTodos([]);

    try {
      await clearTodos(userId);
      showNotice({ kind: "info", text: "Đã xóa tất cả công việc" });
    } catch (err) {
      setTodos(snapshot);
      showNotice({ kind: "error", text: (err as Error).message });
    }
  }, [showNotice, todos, userId]);

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.is_completed).length,
    [todos],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Voice Todo</h1>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M15 12H4m0 0l3.5-3.5M4 12l3.5 3.5M14 5h3a2 2 0 012 2v10a2 2 0 01-2 2h-3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Đăng xuất
            </button>
          )}
        </div>
        <p className="mt-1 flex items-center justify-between text-sm text-slate-400">
          <span>{username ? `@${username}` : "Khách"}</span>
          <span>{remaining} việc cần làm</span>
        </p>
        <p className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
          <span>{today}</span>
          {todos.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-full px-2 py-0.5 font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
            >
              Xóa tất cả
            </button>
          )}
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

      {pending && (
        <TranscriptEditor
          raw={pending.raw}
          task={pending.task}
          time={pending.time}
          onTaskChange={(task) => setPending((prev) => (prev ? { ...prev, task } : prev))}
          onTimeChange={(time) => setPending((prev) => (prev ? { ...prev, time } : prev))}
          onSave={savePending}
          onCancel={() => setPending(null)}
        />
      )}

      {pendingTasks && (
        <TaskListEditor
          tasks={pendingTasks}
          recordingId={recordingRowId}
          isListening={isListening}
          onChange={updatePendingTask}
          onRemove={removePendingTask}
          onRecord={handleRowRecord}
          onConfirm={confirmPendingTasks}
          onCancel={cancelPendingTasks}
        />
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

      <VoiceButton
        isListening={isListening}
        isSupported={isSupported}
        isProcessing={isProcessing}
        onClick={handleVoiceToggle}
      />
    </div>
  );
}
