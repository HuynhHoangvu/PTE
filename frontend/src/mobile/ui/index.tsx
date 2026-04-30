import React from "react";
import { clsx } from "clsx";

// ── MButton ───────────────────────────────────────────────────────────────────
interface MButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "dark" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}
export function MButton({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  children,
  className,
  disabled,
  ...props
}: MButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants = {
    primary:
      "bg-brand-gold text-white shadow-gold-sm hover:bg-brand-gold-bright",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:border-brand-gold/40",
    ghost: "text-brand-gold hover:bg-brand-gold-soft",
    dark: "bg-brand-black text-brand-gold-bright hover:bg-brand-dark2",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  const sizes = {
    sm: "min-h-[36px] px-4 text-sm rounded-xl",
    md: "min-h-[48px] px-6 text-[15px]",
    lg: "min-h-[56px] px-8 text-base",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// ── MCard ─────────────────────────────────────────────────────────────────────
interface MCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "glass" | "dark";
  onPress?: () => void;
}
export function MCard({ children, className, variant = "default", onPress }: MCardProps) {
  const variants = {
    default: "bg-white border border-gray-100/80 rounded-2xl shadow-card",
    elevated: "m-card-elevated",
    glass: "m-card-glass",
    dark: "m-card-dark text-white",
  };
  if (onPress) {
    return (
      <button
        onClick={onPress}
        className={clsx(
          "w-full text-left transition-all duration-200 active:scale-[0.98]",
          variants[variant],
          className
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={clsx(variants[variant], className)}>{children}</div>
  );
}

// ── MInput ────────────────────────────────────────────────────────────────────
interface MInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
export function MInput({ label, error, leftIcon, rightIcon, className, ...props }: MInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          {...props}
          className={clsx(
            "m-input",
            leftIcon && "pl-11",
            rightIcon && "pr-11",
            error && "border-red-400 focus:border-red-400 focus:ring-red-200",
            className
          )}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ── MBadge ────────────────────────────────────────────────────────────────────
export function MBadge({
  children,
  color = "gold",
}: {
  children: React.ReactNode;
  color?: "gold" | "green" | "red" | "blue" | "orange" | "gray" | "purple";
}) {
  const colors: Record<string, string> = {
    gold: "bg-brand-gold-soft text-brand-gold border border-brand-gold/30",
    green: "bg-green-50 text-green-700 border border-green-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    orange: "bg-orange-50 text-orange-700 border border-orange-200",
    gray: "bg-gray-100 text-gray-600 border border-gray-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full",
        colors[color] || colors.gray
      )}
    >
      {children}
    </span>
  );
}

// ── MProgressBar ──────────────────────────────────────────────────────────────
export function MProgressBar({
  value,
  max,
  color = "gold",
  height = "h-1.5",
  animated = false,
}: {
  value: number;
  max: number;
  color?: "gold" | "green" | "blue" | "red" | "orange";
  height?: string;
  animated?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors: Record<string, string> = {
    gold: "bg-brand-gold",
    green: "bg-green-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
  };
  return (
    <div className={clsx("bg-gray-100 rounded-full overflow-hidden", height)}>
      <div
        className={clsx(
          "h-full rounded-full",
          colors[color] || colors.gold,
          animated && "transition-all duration-700 ease-out"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── MSkeleton ─────────────────────────────────────────────────────────────────
export function MSkeleton({ className }: { className?: string }) {
  return <div className={clsx("m-skeleton", className)} />;
}

// ── MWaveform ─────────────────────────────────────────────────────────────────
export function MWaveform({ active, size = "md" }: { active: boolean; size?: "sm" | "md" | "lg" }) {
  const bars = active ? 10 : 8;
  const heights = [3, 5, 8, 5, 3, 7, 4, 6, 5, 3];
  const sizeMap = { sm: "h-6", md: "h-10", lg: "h-14" };
  return (
    <div className={clsx("flex items-center justify-center gap-0.5", sizeMap[size])}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "w-1 rounded-full transition-all",
            active ? "wave-bar-active bg-brand-gold" : "bg-gray-300"
          )}
          style={{
            height: active ? `${heights[i % heights.length] * 4}px` : "6px",
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── MScorePanel ───────────────────────────────────────────────────────────────
const LABEL_MAP: Record<string, string> = {
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

function rubricMaxFor(key: string, maxScore: number, bd: any): number {
  const explicit = Number(bd?.[`${key}_max`]);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (maxScore === 1) return 1;
  if (maxScore === 9) return key === "content" ? 4 : key === "form" ? 1 : 2;
  if (maxScore === 13) return key === "content" ? 3 : 5;
  if (maxScore === 15) return 5;
  return maxScore;
}

function legacyToRubric(raw: number, max: number): number {
  if (raw <= max) return raw;
  if (raw >= 60) return max;
  if (raw >= 40) return Math.max(0, max - 1);
  if (raw > 0) return Math.max(1, max - 2);
  return 0;
}

export function MScorePanel({
  totalScore,
  breakdown,
  feedback,
  maxScore = 90,
}: {
  totalScore: number;
  breakdown?: Record<string, any>;
  feedback?: string;
  maxScore?: number;
}) {
  const entries = breakdown
    ? Object.entries(breakdown).filter(
        ([k, v]) =>
          !k.endsWith("_max") &&
          !["details", "total", "total_max", "pte_score", "phase2", "word_alignment"].includes(k) &&
          typeof v === "number"
      )
    : [];

  const needsRemap =
    maxScore <= 15 && entries.some(([k, v]) => (v as number) > rubricMaxFor(k, maxScore, breakdown));

  const displayEntries = entries.map(([k, v]) => {
    const max = rubricMaxFor(k, maxScore, breakdown);
    return { key: k, value: needsRemap ? legacyToRubric(v as number, max) : (v as number), max };
  });

  const displayTotal = needsRemap
    ? Math.min(maxScore, displayEntries.reduce((s, e) => s + e.value, 0))
    : totalScore;

  const pct = maxScore > 0 ? Math.min(100, (displayTotal / maxScore) * 100) : 0;
  const grade =
    pct >= 79 ? "Xuất sắc" : pct >= 65 ? "Tốt" : pct >= 50 ? "Đạt" : "Cần luyện";
  const gradeColor =
    pct >= 79 ? "text-green-600" : pct >= 65 ? "text-brand-gold" : pct >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Score ring */}
      <div className="flex items-center gap-4 bg-brand-gold-soft rounded-2xl p-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="#e4a808"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 163} 163`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-display font-black text-gray-900">{displayTotal}</span>
            <span className="text-[9px] text-gray-400">/{maxScore}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 mb-0.5">Tổng điểm AI</p>
          <p className={clsx("font-display font-black text-xl", gradeColor)}>{grade}</p>
        </div>
      </div>

      {/* Breakdown */}
      {displayEntries.length > 0 && (
        <div className="space-y-3">
          {displayEntries.map(({ key, value, max: cm }) => {
            const cp = cm > 0 ? Math.min(100, (value / cm) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">
                    {LABEL_MAP[key] || key}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: cp >= 79 ? "#16a34a" : cp >= 50 ? "#e4a808" : "#ef4444",
                    }}
                  >
                    {value}/{cm}
                  </span>
                </div>
                <MProgressBar
                  value={value}
                  max={cm}
                  color={cp >= 79 ? "green" : cp >= 50 ? "gold" : "red"}
                  height="h-2"
                  animated
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-400 mb-1">Nhận xét AI</p>
          <p className="text-sm text-gray-700 leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}

// ── MAudioPlayer ──────────────────────────────────────────────────────────────
export function MAudioPlayer({
  src,
  countdownSeconds = 0,
  onCountdownEnd,
  onEnded,
  showSpeedControl,
}: {
  src?: string;
  countdownSeconds?: number;
  onCountdownEnd?: () => void;
  onEnded?: () => void;
  showSpeedControl?: boolean;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [countdown, setCountdown] = React.useState(countdownSeconds);
  const [speed, setSpeed] = React.useState(1);
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
        if (audioRef.current && src) audioRef.current.play().then(() => setPlaying(true));
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdownSeconds, src]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => { setPlaying(false); onEnded?.(); }}
        />
      )}
      {countdown > 0 && (
        <p className="text-sm text-gray-500 text-center mb-3">
          Bắt đầu sau{" "}
          <span className="font-bold text-brand-gold">{fmt(countdown)}</span>
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform shadow-gold-sm"
        >
          {playing ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <span className="text-xs text-gray-400 w-10 tabular-nums">{fmt(currentTime)}</span>
        <div
          className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div
            className="h-full bg-brand-gold rounded-full transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{fmt(duration)}</span>
        {showSpeedControl && (
          <select
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              if (audioRef.current) audioRef.current.playbackRate = v;
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ── MSheet (Bottom Sheet) ─────────────────────────────────────────────────────
export function MSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="m-sheet-overlay" onClick={onClose} />
      <div className="m-sheet-panel animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2" />
          {title && (
            <h3 className="font-display font-bold text-base text-gray-900">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pb-4">{children}</div>
      </div>
    </>
  );
}

// ── MEmptyState ───────────────────────────────────────────────────────────────
export function MEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 leading-relaxed mb-5">{description}</p>}
      {action}
    </div>
  );
}
