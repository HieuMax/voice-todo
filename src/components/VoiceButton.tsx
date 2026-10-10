"use client";

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
}

export default function VoiceButton({ isListening, isSupported, onClick }: VoiceButtonProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <span
        className={`pointer-events-none rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur transition ${
          isListening ? "text-rose-600" : "text-slate-500"
        }`}
      >
        {!isSupported
          ? "Thiết bị không hỗ trợ nhận diện giọng nói"
          : isListening
            ? "Đang nghe... nói công việc của bạn"
            : "Nhấn để nói"}
      </span>

      <button
        type="button"
        aria-label="Bắt đầu ghi âm"
        aria-pressed={isListening}
        onClick={onClick}
        disabled={!isSupported}
        className={`pointer-events-auto relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${
          isListening
            ? "bg-rose-500 shadow-rose-500/40"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/40"
        }`}
      >
        {isListening && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="absolute -inset-2 animate-pulse rounded-full border-2 border-rose-300/70" />
          </>
        )}

        <svg viewBox="0 0 24 24" fill="none" className="relative h-8 w-8" aria-hidden>
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
  );
}
