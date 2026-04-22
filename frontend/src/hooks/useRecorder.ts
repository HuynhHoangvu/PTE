import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'countdown' | 'recording' | 'stopped';

interface UseRecorderOptions {
  prepSeconds?: number;       // countdown before recording starts
  maxSeconds?: number;        // max recording duration
  onStop?: (blob: Blob, duration: number) => void;
}

export function useRecorder({ prepSeconds = 0, maxSeconds = 40, onStop }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>('idle');
  const [countdown, setCountdown] = useState(prepSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimers = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      // User clicked manually → skip countdown, record immediately
      beginActualRecording(stream);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  }, [prepSeconds, maxSeconds]);

  const beginActualRecording = (stream: MediaStream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRef.current = recorder;
    startTimeRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onStop?.(blob, duration);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(100);
    setState('recording');
    setElapsed(0);

    // Elapsed timer
    elapsedRef.current = setInterval(() => {
      setElapsed((p) => {
        if (p + 1 >= maxSeconds) {
          stopRecording();
          return p + 1;
        }
        return p + 1;
      });
    }, 1000);
  };

  const stopRecording = useCallback(() => {
    clearTimers();
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
    }
    setState('stopped');
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    setState('idle');
    setCountdown(prepSeconds);
    setElapsed(0);
    setAudioUrl(null);
    chunksRef.current = [];
  }, [prepSeconds]);

  useEffect(() => () => clearTimers(), []);

  return { state, countdown, elapsed, audioUrl, startRecording, stopRecording, reset };
}
