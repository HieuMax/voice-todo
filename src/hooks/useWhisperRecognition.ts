"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface UseWhisperRecognitionOptions {
  enabled: boolean;
  lang?: string;
  onResult?: (transcript: string, alternatives: string[]) => void;
  onError?: (message: string) => void;
}

interface UseWhisperRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  start: () => void;
  stop: () => void;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function subscribe(): () => void {
  return () => {};
}

function getMediaSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function getServerMediaSnapshot(): boolean {
  return false;
}

export function useWhisperRecognition({
  enabled,
  lang = "vi",
  onResult,
  onError,
}: UseWhisperRecognitionOptions): UseWhisperRecognitionReturn {
  const mediaSupported = useSyncExternalStore(
    subscribe,
    getMediaSnapshot,
    getServerMediaSnapshot,
  );
  const isSupported = enabled && mediaSupported;
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const transcribe = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsProcessing(true);
      try {
        const form = new FormData();
        form.append("audio", blob, `audio.${extensionFor(mimeType)}`);
        form.append("lang", lang);

        const response = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await response.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Không nhận diện được giọng nói.");
        }

        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (text) onResultRef.current?.(text, [text]);
        else onErrorRef.current?.("Không nghe thấy giọng nói, vui lòng thử lại.");
      } catch (error) {
        onErrorRef.current?.((error as Error).message);
      } finally {
        setIsProcessing(false);
      }
    },
    [lang],
  );

  const start = useCallback(async () => {
    if (!isSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        void transcribe(blob, type);
      };

      recorder.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      onErrorRef.current?.("Không truy cập được micro. Vui lòng kiểm tra quyền.");
    }
  }, [isSupported, transcribe]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  return { isSupported, isListening, isProcessing, start, stop };
}
