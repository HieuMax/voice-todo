"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string) => void;
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
  "not-allowed": "Bạn cần cho phép truy cập micro để dùng tính năng này.",
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

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const RecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!RecognitionConstructor) return;

    const recognition = new RecognitionConstructor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "aborted") return;
      const message = mapError(event.error);
      setError(message);
      onErrorRef.current?.(message);
    };

    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!text) return;
      setTranscript(text);
      onResultRef.current?.(text);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError(null);
    try {
      recognition.start();
    } catch {
      // start() throws if the engine is already running; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => setTranscript(""), []);

  return { isSupported, isListening, error, transcript, start, stop, reset };
}
