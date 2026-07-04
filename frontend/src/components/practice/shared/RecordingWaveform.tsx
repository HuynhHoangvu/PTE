import React from "react";

interface RecordingWaveformProps {
  audioUrl: string; // blob URL from useRecorder
  durationSec: number;
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// Compact playback control so the user can listen back to their own recording.
// Detailed pause/fluency analysis lives in the AI score breakdown + WordComparison, not here.
export function RecordingWaveform({ audioUrl, durationSec }: RecordingWaveformProps) {
  const [duration, setDuration] = React.useState(durationSec);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const rafRef = React.useRef<number | null>(null);

  const startTracking = () => {
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const stopTracking = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };
  React.useEffect(() => () => stopTracking(), []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      stopTracking();
      setIsPlaying(false);
    } else {
      audio.play();
      startTracking();
      setIsPlaying(true);
    }
  };

  const seekTo = (frac: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const t = Math.min(duration, Math.max(0, frac * duration));
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Tạm dừng phát lại bản ghi âm" : "Phát lại bản ghi âm của bạn"}
          className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center flex-shrink-0 shadow-gold-sm active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <div
            className="relative h-2 bg-gray-100 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-brand-gold rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-gray-400 font-mono">{fmt(currentTime)}</p>
            <p className="text-[10px] text-gray-400 font-mono">{fmt(duration)}</p>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onEnded={() => { setIsPlaying(false); stopTracking(); setCurrentTime(duration); }}
      />
    </div>
  );
}
