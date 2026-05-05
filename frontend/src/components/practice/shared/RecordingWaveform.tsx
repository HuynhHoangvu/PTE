import React from "react";
import { clsx } from "clsx";

interface WaveBar {
  amp: number;       // 0–1 normalized amplitude
  isPause: boolean;  // true = prolonged silence
}

interface RecordingWaveformProps {
  audioUrl: string; // blob URL from useRecorder
  durationSec: number;
}

const NUM_BARS = 120;
const SILENCE_THRESHOLD = 0.04; // below this = silent frame
const PAUSE_CONSECUTIVE = 6;    // N consecutive silent bars = "pause"

// ── Decode & analyze audio ────────────────────────────────────────────────────
async function analyzeAudio(audioUrl: string): Promise<{ bars: WaveBar[]; duration: number }> {
  const res = await fetch(audioUrl);
  const arrayBuffer = await res.arrayBuffer();

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }

  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / NUM_BARS);
  const rawAmps: number[] = [];

  for (let i = 0; i < NUM_BARS; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    rawAmps.push(sum / blockSize);
  }

  // Normalize to 0–1
  const maxAmp = Math.max(...rawAmps, 0.001);
  const normalized = rawAmps.map((v) => v / maxAmp);

  // Detect pauses: N consecutive frames below threshold
  const silentFrames = normalized.map((v) => v < SILENCE_THRESHOLD);
  const isPause = silentFrames.map((_, i) => {
    let count = 0;
    for (let j = Math.max(0, i - PAUSE_CONSECUTIVE + 1); j <= i; j++) {
      if (silentFrames[j]) count++;
    }
    return count >= PAUSE_CONSECUTIVE;
  });

  const bars: WaveBar[] = normalized.map((amp, i) => ({ amp, isPause: isPause[i] }));
  return { bars, duration: audioBuffer.duration };
}

// ── Pause marker positions (start of each pause group) ───────────────────────
function getPauseRegions(bars: WaveBar[]): { start: number; end: number }[] {
  const regions: { start: number; end: number }[] = [];
  let inPause = false;
  let startIdx = 0;
  bars.forEach((b, i) => {
    if (b.isPause && !inPause) { inPause = true; startIdx = i; }
    else if (!b.isPause && inPause) { regions.push({ start: startIdx, end: i - 1 }); inPause = false; }
  });
  if (inPause) regions.push({ start: startIdx, end: bars.length - 1 });
  return regions;
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function RecordingWaveform({ audioUrl, durationSec }: RecordingWaveformProps) {
  const [bars, setBars] = React.useState<WaveBar[]>([]);
  const [duration, setDuration] = React.useState(durationSec);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(false);
    analyzeAudio(audioUrl)
      .then(({ bars: b, duration: d }) => {
        setBars(b);
        setDuration(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [audioUrl]);

  // RAF-based time tracking for smooth cursor
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

  const seekToBar = (barIdx: number) => {
    const audio = audioRef.current;
    if (!audio || bars.length === 0) return;
    const t = (barIdx / bars.length) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const pauseRegions = React.useMemo(() => getPauseRegions(bars), [bars]);
  const pauseCount = pauseRegions.filter((r) => r.end - r.start >= PAUSE_CONSECUTIVE).length;

  const activeFraction = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.floor(activeFraction * bars.length);

  // Smoothness score: fewer pauses = smoother
  const smoothness = bars.length > 0
    ? Math.round((1 - bars.filter((b) => b.isPause).length / bars.length) * 100)
    : 0;

  const smoothColor = smoothness >= 80 ? "text-green-600" : smoothness >= 60 ? "text-amber-600" : "text-red-500";
  const smoothLabel = smoothness >= 80 ? "Mượt mà" : smoothness >= 60 ? "Khá ổn" : "Nhiều chỗ dừng";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <p className="font-bold text-sm text-gray-900">Sóng âm bản ghi của bạn</p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={clsx("font-display font-black text-sm leading-none", smoothColor)}>
                {smoothness}%
              </p>
              <p className={clsx("text-[9px] font-bold", smoothColor)}>{smoothLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Waveform area */}
      <div className="px-3 pt-3 pb-2">
        {loading && (
          <div className="flex items-center justify-center h-16 gap-2">
            <span className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Đang phân tích sóng âm...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-gray-400">Không thể hiển thị sóng âm</p>
          </div>
        )}

        {!loading && !error && bars.length > 0 && (
          <>
            {/* Pause markers row */}
            <div className="relative flex items-end mb-0.5" style={{ height: 14 }}>
              {pauseRegions.map((r, i) => {
                const leftPct = (r.start / bars.length) * 100;
                const widthPct = ((r.end - r.start + 1) / bars.length) * 100;
                if (widthPct < 1) return null;
                return (
                  <div
                    key={i}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    <div className="w-full h-1.5 bg-red-200 rounded-full opacity-80" />
                    {widthPct > 4 && (
                      <p className="text-[7px] text-red-400 font-bold mt-0.5 whitespace-nowrap">pause</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Waveform bars */}
            <div
              className="relative flex items-center gap-[1px] cursor-pointer select-none"
              style={{ height: 56 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const frac = (e.clientX - rect.left) / rect.width;
                seekToBar(Math.floor(frac * bars.length));
              }}
            >
              {bars.map((bar, i) => {
                const isActive = i < activeBars;
                const minH = 3;
                const maxH = 48;
                const h = Math.max(minH, Math.round(bar.amp * maxH));

                let color: string;
                if (bar.isPause) {
                  color = isActive ? "#fca5a5" : "#fee2e2"; // red tones for pause
                } else if (isActive) {
                  color = "#f59e0b"; // gold for played
                } else {
                  color = "#fde68a"; // light gold for unplayed
                }

                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-colors duration-75"
                    style={{ height: h, backgroundColor: color, minWidth: 1 }}
                  />
                );
              })}

              {/* Playback cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-800 rounded-full shadow-sm pointer-events-none"
                style={{ left: `${activeFraction * 100}%`, transition: "left 0.05s linear" }}
              />
            </div>

            {/* Timestamp row */}
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-gray-400 font-mono">{fmt(currentTime)}</p>
              <p className="text-[10px] text-gray-400 font-mono">{fmt(duration)}</p>
            </div>
          </>
        )}
      </div>

      {/* Controls + Stats */}
      {!loading && !error && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
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

            {/* Stats */}
            <div className="flex-1 flex items-center gap-3">
              <div className="text-center">
                <p className="font-display font-black text-base text-gray-900 leading-none">{fmt(duration)}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">thời lượng</p>
              </div>
              <div className="w-px h-6 bg-gray-100" />
              <div className="text-center">
                <p className={clsx("font-display font-black text-base leading-none", pauseCount === 0 ? "text-green-600" : pauseCount <= 2 ? "text-amber-600" : "text-red-500")}>
                  {pauseCount}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">chỗ dừng</p>
              </div>
              <div className="w-px h-6 bg-gray-100" />
              <div className="text-center">
                <p className={clsx("font-display font-black text-base leading-none", smoothColor)}>{smoothness}%</p>
                <p className="text-[9px] text-gray-400 mt-0.5">liên tục</p>
              </div>
            </div>
          </div>

          {/* Hint */}
          <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2 flex items-start gap-2">
            <span className="text-sm flex-shrink-0">💡</span>
            <p className="text-[11px] text-gray-500 leading-snug">
              {pauseCount === 0
                ? "Xuất sắc! Không có khoảng dừng — giọng nói liền mạch cho điểm Fluency cao."
                : pauseCount <= 2
                ? `${pauseCount} chỗ dừng — khá tốt. Luyện đọc lướt trước để nói mượt hơn.`
                : `${pauseCount} chỗ dừng — ảnh hưởng điểm Fluency. Đọc thành tiếng mỗi ngày để giảm hesitation.`}
              {" "}Vùng tô <span className="text-red-500 font-semibold">đỏ</span> = khoảng lặng, <span className="text-amber-500 font-semibold">vàng</span> = có tiếng nói.
            </p>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => { setIsPlaying(false); stopTracking(); setCurrentTime(duration); }}
        preload="auto"
      />
    </div>
  );
}
