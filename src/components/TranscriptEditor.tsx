"use client";

interface TranscriptEditorProps {
  raw: string;
  task: string;
  time: string;
  onTaskChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function TranscriptEditor({
  raw,
  task,
  time,
  onTaskChange,
  onTimeChange,
  onSave,
  onCancel,
}: TranscriptEditorProps) {
  return (
    <div className="mx-5 mt-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-400">Nghe được</p>
      <p className="mt-0.5 text-sm italic text-slate-500">“{raw}”</p>

      <label className="mt-3 block text-xs font-medium text-slate-500">
        Công việc
        <input
          value={task}
          onChange={(event) => onTaskChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
          }}
          placeholder="Việc cần làm"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="mt-3 block text-xs font-medium text-slate-500">
        Giờ nhắc (tuỳ chọn)
        <input
          type="time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          Lưu
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
