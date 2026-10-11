"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  isMicrophoneDeniedError,
  MICROPHONE_BLOCKED_MESSAGE,
  MICROPHONE_ERROR_MESSAGE,
} from "@/lib/microphone";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string, alternatives: string[]) => void;
  onError?: (message: string) => void;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  error: string | null;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": MICROPHONE_BLOCKED_MESSAGE,
  "service-not-allowed": "Trình duyệt chưa được cấp quyền dùng micro.",
  "audio-capture": "Không tìm thấy micro trên thiết bị.",
  "no-speech": "Không nghe thấy giọng nói, vui lòng thử lại.",
  network: "Lỗi kết nối mạng khi nhận diện giọng nói.",
  aborted: "Đã dừng ghi âm.",
};

function mapError(code: string): string {
  return ERROR_MESSAGES[code] ?? `Lỗi nhận diện giọng nói (${code}).`;
}

function subscribe(): () => void {
  return () => {};
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function getSnapshot(): boolean {
  return Boolean(getRecognitionConstructor());
}

function getServerSnapshot(): boolean {
  return false;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { lang = "vi-VN", onResult, onError } = options;

  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const dispose = useCallback((recognition: SpeechRecognition | null) => {
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // stop() throws if the engine is not running; ignore.
    }
  }, []);

  const start = useCallback(() => {
    const RecognitionConstructor = getRecognitionConstructor();
    if (!RecognitionConstructor) return;

    const previous = recognitionRef.current;
    if (previous) {
      dispose(previous);
      try {
        previous.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript("");

    const recognition = new RecognitionConstructor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    let sessionAlternatives: string[] = [];
    let hasDispatched = false;

    const emit = (alternatives: string[]) => {
      const cleaned = alternatives.map((alt) => alt.trim()).filter(Boolean);
      if (cleaned.length === 0 || hasDispatched) return;
      hasDispatched = true;
      setTranscript(cleaned[0]);
      onResultRef.current?.(cleaned[0], cleaned);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const interim: string[] = [];
      const finalResults: SpeechRecognitionResult[] = [];

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalResults.push(result);
        else {
          const text = result[0]?.transcript ?? "";
          if (text.trim()) interim[0] = `${interim[0] ?? ""}${text}`;
        }
      }

      if (finalResults.length > 0) {
        const altCount = Math.max(...finalResults.map((r) => r.length));
        const alternatives: string[] = [];
        for (let k = 0; k < altCount; k += 1) {
          const combined = finalResults
            .map((r) => r[k]?.transcript ?? "")
            .join(" ")
            .trim();
          if (combined) alternatives.push(combined);
        }
        emit(alternatives);
      } else if (interim[0]) {
        sessionAlternatives = [interim[0]];
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "aborted") return;
      const message = mapError(event.error);
      setError(message);
      onErrorRef.current?.(message);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Safari (and sometimes Chrome) end the session without ever marking the
      // result as final. Flush whatever interim hypothesis we captured.
      if (!hasDispatched) emit(sessionAlternatives);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      // Some browsers reject synchronously (e.g. blocked permission) instead
      // of firing onerror, so surface it and let the user try again.
      setIsListening(false);
      const message = isMicrophoneDeniedError(error)
        ? MICROPHONE_BLOCKED_MESSAGE
        : MICROPHONE_ERROR_MESSAGE;
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [dispose, lang]);

  const reset = useCallback(() => setTranscript(""), []);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        dispose(recognition);
        try {
          recognition.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [dispose]);

  return { isSupported, isListening, error, transcript, start, stop, reset };
}
