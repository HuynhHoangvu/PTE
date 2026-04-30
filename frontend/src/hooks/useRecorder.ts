import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'countdown' | 'recording' | 'stopped';

interface UseRecorderOptions {
  prepSeconds?: number;
  maxSeconds?: number;
  onStop?: (blob: Blob, duration: number) => void;
}

export function useRecorder({ prepSeconds = 0, maxSeconds = 40, onStop }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>('idle');
  const [countdown, setCountdown] = useState(prepSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

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
    clearTimers();
    setMicError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError('Trình duyệt không hỗ trợ ghi âm. Vui lòng cập nhật ứng dụng.');
        setState('idle');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      beginActualRecording(stream);
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicError('Quyền microphone bị từ chối. Vào Cài đặt → Ứng dụng → Fly PTE → Quyền → bật Microphone.');
      } else if (name === 'NotFoundError') {
        setMicError('Không tìm thấy microphone trên thiết bị này.');
      } else {
        setMicError('Không thể mở microphone. Kiểm tra lại quyền trong Cài đặt.');
      }
      setState('idle');
    }
  }, []);

  const startAutoRecording = useCallback((currentState?: RecorderState) => {
    if (currentState === 'recording' || currentState === 'stopped') return;
    clearTimers();
    if (prepSeconds <= 0) {
      void startRecording();
      return;
    }
    setState('countdown');
    setCountdown(prepSeconds);
    let c = prepSeconds;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(Math.max(c, 0));
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        void startRecording();
      }
    }, 1000);
  }, [prepSeconds, startRecording]);

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
      setAudioUrl(URL.createObjectURL(blob));
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onStop?.(blob, duration);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start(100);
    setState('recording');
    setElapsed(0);
    elapsedRef.current = setInterval(() => {
      setElapsed((p) => {
        if (p + 1 >= maxSeconds) { stopRecording(); return p + 1; }
        return p + 1;
      });
    }, 1000);
  };

  const stopRecording = useCallback(() => {
    clearTimers();
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    setState('stopped');
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    setState('idle');
    setCountdown(prepSeconds);
    setElapsed(0);
    setAudioUrl(null);
    setMicError(null);
    chunksRef.current = [];
  }, [prepSeconds]);

  useEffect(() => () => clearTimers(), []);

  return { state, countdown, elapsed, audioUrl, micError, startRecording, startAutoRecording, stopRecording, reset };
}
