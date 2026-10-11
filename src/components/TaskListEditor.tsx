"use client";

export interface PendingTask {
  id: string;
  raw: string;
  task: string;
  time: string;
}

interface TaskListEditorProps {
  tasks: PendingTask[];
  recordingId: string | null;
  isListening: boolean;
  onChange: (id: string, patch: Partial<Pick<PendingTask, "task" | "time">>) => void;
  onRemove: (id: string) => void;
  onRecord: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaskListEditor({
  tasks,
  recordingId,
  isListening,
  onChange,
  onRemove,
  onRecord,
  onConfirm,
  onCancel,
}: TaskListEditorProps) {
  return (
    <div className="mx-5 mt-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">
        Đã nghe {tasks.length} công việc
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        Sửa trực tiếp hoặc nhấn micro để nói lại từng việc.
      </p>

      <ul className="mt-3 space-y-3">
        {tasks.map((item) => {
          const recording = recordingId === item.id && isListening;
          return (
            <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={item.task}
                    onChange={(event) => onChange(item.id, { task: event.target.value })}
                    placeholder="Việc cần làm"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={item.time}
                      onChange={(event) => onChange(item.id, { time: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="ml-auto rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRecord(item.id)}
                  aria-label={recording ? "Dừng ghi âm việc này" : "Nói lại việc này"}
                  aria-pressed={recording}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition active:scale-95 ${
                    recording
                      ? "animate-pulse bg-rose-500"
                      : "bg-gradient-to-br from-indigo-500 to-violet-600"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
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
                </button>
              </div>

              {item.raw && (
                <p className="mt-1.5 text-xs italic text-slate-400">“{item.raw}”</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          Xác nhận tất cả
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
