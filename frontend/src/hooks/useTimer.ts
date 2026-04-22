import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(initialSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(ref.current!);
          setRunning(false);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [running, onExpire]);

  const pause = useCallback(() => {
    clearInterval(ref.current!);
    setRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    clearInterval(ref.current!);
    setRunning(false);
    setSeconds(newSeconds ?? initialSeconds);
  }, [initialSeconds]);

  useEffect(() => () => clearInterval(ref.current!), []);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return { seconds, formatted, running, start, pause, reset };
}
