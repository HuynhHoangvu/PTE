import React from "react";
import { clsx } from "clsx";

// ── Button ────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "yellow" | "orange" | "dark" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "yellow",
  size = "md",
  loading,
  children,
  className,
  ...props
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all duration-150 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    yellow:
      "bg-brand-gold text-white hover:bg-brand-gold-bright shadow-gold-sm hover:shadow-gold-md",
    orange: "bg-brand-orange text-white hover:bg-brand-orange-deep",
    dark:   "bg-brand-black text-brand-gold hover:bg-brand-dark2",
    ghost:
      "bg-transparent border border-gray-200 text-gray-600 hover:border-brand-gold/40 hover:text-brand-gold",
    outline:
      "bg-white border-2 border-brand-gold text-brand-gold hover:bg-brand-gold-soft",
  };
  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({
  children,
  color = "yellow",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  const colors: Record<string, string> = {
    yellow:
      "bg-brand-yellow-light text-brand-yellow-deep border border-yellow-200",
    orange: "bg-brand-orange-light text-brand-orange-deep",
    black: "bg-brand-black text-brand-yellow",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    pink: "bg-pink-100 text-pink-700",
    gray: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded",
        colors[color] || colors.gray,
      )}
    >
      {children}
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  max,
  color = "yellow",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors: Record<string, string> = {
    yellow:   "bg-brand-gold",
    gold:     "bg-brand-gold",
    orange:   "bg-brand-orange",
    black:    "bg-brand-black",
    green:    "bg-green-500",
    gradient: "bg-gradient-to-r from-brand-gold to-brand-gold-bright",
  };
  return (
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500",
          colors[color] || colors.yellow,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Audio Player ──────────────────────────────────────────────────────────
interface AudioPlayerProps {
  src?: string;
  countdownSeconds?: number;
  speed?: number;
  onCountdownEnd?: () => void;
  onEnded?: () => void;
  showSpeedControl?: boolean;
}

export function AudioPlayer({
  src,
  countdownSeconds = 0,
  speed = 1,
  onCountdownEnd,
  onEnded,
  showSpeedControl,
}: AudioPlayerProps) {
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [countdown, setCountdown] = React.useState(countdownSeconds);
  const [spd, setSpd] = React.useState(speed);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval>>();

  React.useEffect(() => {
    if (countdownSeconds <= 0) return;
    let c = countdownSeconds;
    setCountdown(c);
    timerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerRef.current);
        onCountdownEnd?.();
        if (audioRef.current && src) {
          audioRef.current.play().then(() => setPlaying(true));
        }
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdownSeconds, src]);

  const togglePlay = () => {
    if (!audioRef.current || !src) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div>
      {countdown > 0 && (
        <p className="text-sm text-gray-500 mb-2">
          Bắt đầu sau{" "}
          <span className="text-brand-gold font-bold">{fmt(countdown)}</span>
          {" "}giây
        </p>
      )}
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={() =>
            setCurrentTime(audioRef.current?.currentTime || 0)
          }
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => {
            setPlaying(false);
            onEnded?.();
          }}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-brand-gold flex items-center justify-center hover:bg-brand-gold-bright transition-colors flex-shrink-0"
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <span className="text-xs text-gray-500 w-10">{fmt(currentTime)}</span>
        <div
          className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pct * duration;
          }}
        >
          <div
            className="h-full bg-brand-gold rounded-full"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : "0%",
            }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {fmt(duration)}
        </span>
        {showSpeedControl && (
          <select
            value={spd}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpd(v);
              if (audioRef.current) audioRef.current.playbackRate = v;
            }}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
          >
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ── Waveform ──────────────────────────────────────────────────────────────
export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0.5 sm:gap-1 h-8 sm:h-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "w-1 rounded-full transition-all",
            active ? "wave-bar-active bg-brand-gold" : "wave-bar bg-gray-300",
          )}
          style={{ height: "8px", animationDelay: `${i * 0.07}s` }}
        />
      ))}
    </div>
  );
}

// ── Score Panel ───────────────────────────────────────────────────────────
interface ScoreBreakdown {
  [key: string]: any;
  phase2?: {
    pauses?: { total_pauses: number; total_pause_time: number };
    wpm_detailed?: { wpm: number };
    pitch?: { f0_mean: number; stability_score: number };
    fluency_analysis?: { fluency_score: number; deductions: string[] };
  };
}

export function ScorePanel({
  totalScore,
  breakdown,
  feedback,
  maxScore = 90,
}: {
  totalScore: number;
  breakdown?: ScoreBreakdown;
  feedback?: string;
  maxScore?: number;
}) {
  const scoreEntries = breakdown
    ? Object.entries(breakdown).filter(
        ([k, v]) =>
          !k.endsWith("_max") &&
          ![
            "details",
            "total",
            "total_max",
            "pte_score",
            "phase2",
            "word_alignment",
          ].includes(k) &&
          typeof v === "number",
      )
    : [];
  const rubricMaxFor = (key: string) => {
    const explicitMax = breakdown ? Number((breakdown as any)[`${key}_max`]) : NaN;
    if (Number.isFinite(explicitMax) && explicitMax > 0) return explicitMax;
    if (maxScore === 1) return 1;
    if (maxScore === 9) return key === "content" ? 4 : key === "form" ? 1 : 2;
    if (maxScore === 13) return key === "content" ? 3 : 5;
    if (maxScore === 15) return 5;
    return maxScore;
  };
  const legacyScaledToRubric = (value: number, rubricMax: number) => {
    if (value <= rubricMax) return value;
    if (value >= 60) return rubricMax;
    if (value >= 40) return Math.max(0, rubricMax - 1);
    if (value > 0) return Math.max(1, rubricMax - 2);
    return 0;
  };
  const hasPteScaledBreakdown =
    maxScore <= 15 &&
    scoreEntries.some(([k, v]) => (v as number) > rubricMaxFor(k));
  const displayScoreEntries = scoreEntries.map(([k, v]) => {
    const componentMax = rubricMaxFor(k);
    const rawValue = v as number;
    const displayValue = hasPteScaledBreakdown
      ? legacyScaledToRubric(rawValue, componentMax)
      : rawValue;
    return { key: k, value: displayValue, max: componentMax };
  });
  const displayTotalScore = hasPteScaledBreakdown
    ? Math.min(
        maxScore,
        displayScoreEntries.reduce((sum, item) => sum + item.value, 0),
      )
    : totalScore;
  const displayMaxScore = maxScore;
  // Calculate percentage for grading (works for any maxScore)
  const percentage =
    displayMaxScore > 0
      ? Math.min(100, (displayTotalScore / displayMaxScore) * 100)
      : 0;
  const grade =
    percentage >= 79
      ? "Xuất sắc 🏆"
      : percentage >= 65
        ? "Tốt 👍"
        : percentage >= 50
          ? "Đạt ✓"
          : "Cần cải thiện";
  const gradeColor =
    percentage >= 79
      ? "text-amber-900"
      : percentage >= 65
        ? "text-amber-800"
        : percentage >= 50
          ? "text-amber-700"
          : "text-red-500";
  const topPercentile = percentage >= 79 ? "5" : percentage >= 65 ? "20" : "50";

  const labelMap: Record<string, string> = {
    pronunciation: "Phát âm",
    fluency: "Trôi chảy",
    content: "Nội dung",
    grammar: "Ngữ pháp",
    vocabulary: "Từ vựng",
    spelling: "Chính tả",
    form: "Hình thức",
    development: "Phát triển ý",
    structure: "Cấu trúc",
    linguistic: "Ngôn ngữ",
  };

  // Phase 2 data extraction
  const phase2 = breakdown?.phase2;

  return (
    <div className="card p-4">
      {/* Overall */}
      <div className="flex items-center gap-4 bg-brand-gold-light rounded-xl p-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-brand-charcoal flex flex-col items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white font-display font-bold text-xl leading-none">
            {displayTotalScore}
          </span>
          <span className="text-[9px] text-brand-gold-light/95">/{displayMaxScore}</span>
        </div>
        <div>
          <p className="text-xs font-bold text-brand-charcoal mb-0.5">
            Tổng điểm AI
          </p>
          <p
            className={clsx(
              "font-display font-bold text-lg leading-tight",
              gradeColor,
            )}
          >
            {grade}
          </p>
          <p className="text-xs text-gray-500">
            Top {topPercentile}% người dùng
          </p>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && displayScoreEntries.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {displayScoreEntries.map(({ key: k, value, max: componentMax }) => {
                const componentPercentage =
                  componentMax > 0
                    ? Math.min(100, (value / componentMax) * 100)
                    : 0;
                return (
                  <div key={k}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {labelMap[k] || k}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            componentPercentage >= 79
                              ? "#16a34a"
                              : componentPercentage >= 50
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      >
                        {value}/{componentMax}
                      </span>
                    </div>
                    <ProgressBar
                      value={value}
                      max={componentMax}
                      color={
                        componentPercentage >= 79
                          ? "green"
                          : componentPercentage >= 50
                            ? "yellow"
                            : "orange"
                      }
                    />
                  </div>
                );
              })}
          </div>
        )}

      {/* Phase 2: Acoustic Analysis */}
      {phase2 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 space-y-2.5">
          <p className="text-xs font-bold text-blue-700 mb-2">
            🎵 Phân tích Âm học (Phase 2)
          </p>

          {/* Speech Rate (WPM) */}
          {phase2.wpm_detailed && (
            <div className="bg-white p-2 rounded border border-blue-50">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Tốc độ nói (WPM)</span>
                <span className="text-sm font-bold text-blue-700">
                  {phase2.wpm_detailed.wpm}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {phase2.wpm_detailed.wpm < 110
                  ? "⚠️ Quá chậm (lý tưởng 110-130)"
                  : phase2.wpm_detailed.wpm > 130
                    ? "⚠️ Quá nhanh (lý tưởng 110-130)"
                    : "✅ Tốc độ lý tưởng (110-130)"}
              </p>
            </div>
          )}

          {/* Pitch Analysis */}
          {phase2.pitch && (
            <div className="bg-white p-2 rounded border border-blue-50">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Pitch F0 Mean</span>
                  <span className="text-sm font-bold text-blue-700">
                    {Math.round(phase2.pitch.f0_mean)} Hz
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Ổn định Pitch</span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color:
                        phase2.pitch.stability_score >= 70
                          ? "#16a34a"
                          : phase2.pitch.stability_score >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {Math.round(phase2.pitch.stability_score)}/100
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {phase2.pitch.stability_score >= 70
                  ? "✅ Pitch rất ổn định"
                  : phase2.pitch.stability_score >= 50
                    ? "⚠️ Pitch có dễn nhưng cần cải thiện"
                    : "⚠️ Pitch không ổn định"}
              </p>
            </div>
          )}

          {/* Pauses */}
          {phase2.pauses && (
            <div className="bg-white p-2 rounded border border-blue-50">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Số lần tạm dừng</span>
                <span className="text-sm font-bold text-blue-700">
                  {phase2.pauses.total_pauses} (
                  {phase2.pauses.total_pause_time.toFixed(1)}s)
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {phase2.pauses.total_pause_time > 3
                  ? "⚠️ Quá nhiều tạm dừng"
                  : "✅ Số lượng tạm dừng bình thường"}
              </p>
            </div>
          )}

          {/* Fluency Deductions */}
          {phase2.fluency_analysis?.deductions &&
            phase2.fluency_analysis.deductions.length > 0 && (
              <div className="bg-white p-2 rounded border border-red-100">
                <p className="text-xs font-semibold text-red-700 mb-1.5">
                  Các điểm cần cải thiện:
                </p>
                <ul className="space-y-0.5">
                  {phase2.fluency_analysis.deductions.map((d, i) => (
                    <li
                      key={i}
                      className="text-[10px] text-red-600 flex items-start gap-1.5"
                    >
                      <span className="text-xs">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-500 mb-1">💬 Nhận xét AI</p>
          <p className="text-xs text-gray-700 leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`m-skeleton rounded-xl ${className || ""}`}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-card space-y-3 ${className || ""}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          <td className="py-3 px-4"><Skeleton className="h-3 w-20" /></td>
          <td className="py-3 px-4"><Skeleton className="h-3 w-16" /></td>
          <td className="py-3 px-4"><Skeleton className="h-3 w-12" /></td>
          <td className="py-3 px-4"><Skeleton className="h-3 w-10" /></td>
        </tr>
      ))}
    </>
  );
}

// ── Analysis Table ────────────────────────────────────────────────────────
interface AnalysisRow {
  id: string;
  timer: string;
  status: string;
  score?: number;
  scoreMax?: number;
  feedback?: string;
  createdAt: string;
}

export function AnalysisTable({
  rows,
  onView,
}: {
  rows: AnalysisRow[];
  onView?: (id: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-brand-gold-light flex items-center justify-center text-sm">
          📊
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Lịch sử luyện tập</p>
          <p className="text-xs text-gray-400">Các lần nộp bài gần đây</p>
        </div>
      </div>
      <table className="w-full analysis-table">
        <thead>
          <tr>
            <th>Timer</th>
            <th>Status</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="text-center text-gray-400 py-8 text-sm"
              >
                Chưa có lần nộp bài nào
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="text-gray-500">{r.timer}</td>
                <td>
                  <span
                    className={clsx(
                      "text-[11px] font-bold px-2 py-0.5 rounded",
                      r.status === "SCORED"
                        ? "bg-green-50 text-green-700"
                        : r.status === "SCORING"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="font-bold text-brand-gold">
                  {r.feedback
                    ? <span className="text-xs font-semibold">{r.feedback}</span>
                    : r.score != null
                      ? <span>{r.score}{r.scoreMax != null ? <span className="text-[10px] font-normal text-gray-400">/{r.scoreMax}</span> : ''}</span>
                      : "—"}
                </td>
                <td>
                  {onView && r.status === "SCORED" && (
                    <button
                      onClick={() => onView(r.id)}
                      className="text-brand-gold text-xs font-bold hover:underline"
                    >
                      👁 Xem
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Question List Drawer ──────────────────────────────────────────────────
interface QListItem {
  id: string;
  code: string;
  title?: string;
  level: string;
  isTrending: boolean;
  isRepeated: boolean;
  userScore?: number;
}

export function QuestionListDrawer({
  open,
  onClose,
  items,
  currentCode,
  onSelect,
  total,
  page,
  onPageChange,
  onRandom,
  randomBusy,
}: {
  open: boolean;
  onClose: () => void;
  items: QListItem[];
  currentCode?: string;
  onSelect: (id: string) => void;
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  /** Random question same filters as list — from PracticeLayout */
  onRandom?: () => void;
  randomBusy?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = items.filter(
    (i) =>
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      (i.title || "").toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">Danh sách câu hỏi</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <svg
              className="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã hoặc tiêu đề..."
              className="flex-1 text-sm outline-none min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRandom && (
              <button
                type="button"
                onClick={onRandom}
                disabled={randomBusy || total === 0}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 hover:bg-amber-100 disabled:opacity-45 whitespace-nowrap"
              >
                {randomBusy ? "…" : "🎲 Random"}
              </button>
            )}
            <span className="text-xs text-gray-500">{total} câu</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {/* Score — hidden on mobile */}
                <th className="hidden sm:table-cell text-left text-[11px] font-bold text-gray-400 uppercase py-2 px-3 w-12">
                  Score
                </th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase py-2 px-3 w-24">
                  No
                </th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase py-2 px-3">
                  Title
                </th>
                {/* Level + Tag — hidden on mobile */}
                <th className="hidden sm:table-cell text-left text-[11px] font-bold text-gray-400 uppercase py-2 px-3 w-20">
                  Level
                </th>
                <th className="hidden sm:table-cell text-left text-[11px] font-bold text-gray-400 uppercase py-2 px-3 w-28">
                  Tag
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  className={clsx(
                    "border-b border-gray-50 cursor-pointer hover:bg-brand-gold-soft/80 transition-colors",
                    item.code === currentCode && "bg-brand-gold-light",
                  )}
                >
                  <td className="hidden sm:table-cell py-2.5 px-3 text-gray-400 text-xs">
                    {item.userScore || 0}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-brand-gold text-xs whitespace-nowrap">
                    {item.code}
                  </td>
                  <td className="py-2.5 px-3 text-gray-800 text-xs max-w-[140px] sm:max-w-none">
                    <span className="line-clamp-2">{item.title || item.code}</span>
                    {/* Level + tags shown inline on mobile */}
                    <div className="flex items-center gap-1 mt-0.5 sm:hidden">
                      <span
                        className={clsx(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          item.level === "Easy"
                            ? "bg-green-100 text-green-700"
                            : item.level === "Hard"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700",
                        )}
                      >
                        {item.level}
                      </span>
                      {item.isRepeated && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700">Rep</span>}
                      {item.isTrending && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">Hot</span>}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell py-2.5 px-3">
                    <span
                      className={clsx(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        item.level === "Easy"
                          ? "bg-green-100 text-green-700"
                          : item.level === "Hard"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700",
                      )}
                    >
                      {item.level}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell py-2.5 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {item.isTrending && (
                        <Badge color="orange">Trending</Badge>
                      )}
                      {item.isRepeated && <Badge color="pink">Repeated</Badge>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 hover:text-brand-gold">
                    🔖
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{total} câu</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="font-bold">Trang {page}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
