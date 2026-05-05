import React from "react";
import { clsx } from "clsx";
import { normalizeScore } from "../../../constants/scoring";

interface WordError {
  word: string;
  issue: string;
  tip: string;
}

interface VocabSuggestion {
  original: string;
  better: string;
  reason: string;
}

interface AITutorPanelProps {
  totalScore: number;
  maxScore: number;
  feedback?: string;
  tutorTip?: string;
  breakdown?: Record<string, number>;
  transcription?: string;
  wordErrors?: WordError[];
  vocabSuggestions?: VocabSuggestion[];
  mode?: "speaking" | "writing";
}

const SCORE_LABELS: Record<string, string> = {
  content: "Nội dung",
  pronunciation: "Phát âm",
  fluency: "Trôi chảy",
  form: "Hình thức",
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  structure: "Cấu trúc",
  linguistic: "Ngôn ngữ",
  spelling: "Chính tả",
};

function scoreColor(pct: number) {
  if (pct >= 0.8) return { text: "text-green-600", bg: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200" };
  if (pct >= 0.6) return { text: "text-amber-600", bg: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  return { text: "text-red-500", bg: "bg-red-400", badge: "bg-red-50 text-red-600 border-red-200" };
}

// ── Highlight mispronounced words in transcription ────────────────────────────
function HighlightedTranscript({
  transcription,
  wordErrors,
}: {
  transcription: string;
  wordErrors: WordError[];
}) {
  const errorByStem = React.useMemo(() => {
    const m = new Map<string, WordError>();
    for (const e of wordErrors) {
      const k = e.word.toLowerCase().replace(/[^a-z0-9']/g, "");
      if (k) m.set(k, e);
    }
    return m;
  }, [wordErrors]);

  const tokens = transcription.split(/(\s+)/);

  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      {tokens.map((token, i) => {
        const trimmed = token.trim();
        if (!trimmed) return <span key={i}>{token}</span>;
        const stemClean = trimmed
          .replace(/^[^\w]+|[^\w]+$/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9']/g, "");
        const err = stemClean ? errorByStem.get(stemClean) : undefined;
        if (err) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 border-b-2 border-red-400 rounded px-0.5 mx-0.5 font-semibold"
              title={err.tip}
            >
              {trimmed}
              <span className="text-[9px] text-red-400" aria-hidden>
                ⚠
              </span>
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </p>
  );
}

// ── Circular score ring ───────────────────────────────────────────────────────
function ScoreRing({ score, max, size = 72 }: { score: number; max: number; size?: number }) {
  const pct = Math.min(score / max, 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  const col = scoreColor(pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct >= 0.8 ? "#22c55e" : pct >= 0.6 ? "#f59e0b" : "#ef4444"}
          strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className={clsx("font-display font-black text-base leading-none", col.text)}>{Math.min(score, max)}</p>
        <p className="text-[9px] text-gray-400">/{max}</p>
      </div>
    </div>
  );
}

export function AITutorPanel({
  totalScore: rawTotal, maxScore, feedback, tutorTip, breakdown,
  transcription, wordErrors = [], vocabSuggestions = [], mode = "speaking",
}: AITutorPanelProps) {
  const [showTranscript, setShowTranscript] = React.useState(false);
  const [expandedError, setExpandedError] = React.useState<number | null>(null);

  const totalScore = normalizeScore(rawTotal, maxScore);
  const pct = totalScore / maxScore;
  const col = scoreColor(pct);

  const scoreLabel =
    pct >= 0.8 ? "Xuất sắc! 🌟" :
    pct >= 0.6 ? "Khá tốt! 👍" :
    pct >= 0.4 ? "Cần cải thiện 📈" : "Cần luyện thêm 💪";

  const breakdownEntries = breakdown
    ? Object.entries(breakdown).filter(([k]) => !k.endsWith("_max") && SCORE_LABELS[k])
    : [];

  return (
    <div className="space-y-3 mt-4">
      {/* ── Score header ── */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <ScoreRing score={totalScore} max={maxScore} size={80} />
          <div className="flex-1">
            <p className="font-display font-black text-xl text-gray-900">{scoreLabel}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalScore}/{maxScore} điểm
            </p>
            {feedback && !feedback.includes("không hoàn chỉnh") && (
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">{feedback}</p>
            )}
          </div>
        </div>

        {/* Score breakdown bars */}
          {breakdownEntries.length > 0 && (
          <div className="mt-4 space-y-2.5 border-t border-gray-50 pt-4">
            {breakdownEntries.map(([key, rawVal]) => {
              const maxKey = `${key}_max`;
              // Use _max from DB (always present for new attempts); fallback infers from overall maxScore
              const maxVal = breakdown?.[maxKey] ?? Math.max(1, Math.round(maxScore / breakdownEntries.length));
              const val = normalizeScore(rawVal, maxVal);
              const p = val / maxVal;
              const c = scoreColor(p);
              return (
                <div key={key} className="flex items-center gap-2">
                  <p className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0">
                    {SCORE_LABELS[key] || key}
                  </p>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-700", c.bg)}
                      style={{ width: `${Math.min(p * 100, 100)}%` }}
                    />
                  </div>
                  <p className={clsx("text-[11px] font-black w-10 text-right flex-shrink-0", c.text)}>
                    {val}/{maxVal}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AI Tutor Tip ── */}
      {tutorTip && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 text-lg">
              🤖
            </div>
            <div className="flex-1">
              <p className="font-bold text-xs text-amber-700 uppercase tracking-widest mb-1">AI Tutor</p>
              <p className="text-sm text-amber-900 leading-relaxed">{tutorTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Word-level pronunciation errors (Speaking) ── */}
      {mode === "speaking" && wordErrors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">🔍</span>
            <p className="font-bold text-sm text-gray-900">Lỗi phát âm cụ thể</p>
            <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
              {wordErrors.length} lỗi
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {wordErrors.map((err, i) => (
              <button
                key={i}
                onClick={() => setExpandedError(expandedError === i ? null : i)}
                className="w-full px-4 py-3 text-left flex items-start gap-3 active:bg-gray-50 transition-colors"
              >
                <span className="text-base flex-shrink-0">🔊</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-red-600 text-sm bg-red-50 px-2 py-0.5 rounded-lg">
                      "{err.word}"
                    </span>
                    <span className="text-xs text-gray-400">{err.issue}</span>
                  </div>
                  {expandedError === i && (
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                      💡 {err.tip}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 text-xs flex-shrink-0 mt-0.5">
                  {expandedError === i ? "▲" : "▼"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Vocabulary upgrades (Writing) ── */}
      {mode === "writing" && vocabSuggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">✨</span>
            <p className="font-bold text-sm text-gray-900">Nâng cấp từ vựng</p>
            <span className="ml-auto bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
              +điểm từ vựng
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {vocabSuggestions.map((v, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm text-gray-500 line-through">{v.original}</span>
                  <span className="text-gray-300">→</span>
                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 text-sm">
                    {v.better}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{v.reason}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100">
            <p className="text-[10px] text-blue-600 font-medium">
              💡 Sử dụng từ học thuật cao hơn giúp tăng điểm Vocabulary và Linguistic
            </p>
          </div>
        </div>
      )}

      {/* ── Transcription (Speaking) ── */}
      {mode === "speaking" && transcription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📝</span>
              <p className="font-bold text-sm text-gray-900">Bản ghi âm</p>
              {wordErrors.length > 0 && (
                <span className="text-[10px] text-red-500 font-medium">
                  ({wordErrors.length} từ lỗi tô đỏ)
                </span>
              )}
            </div>
            <span className="text-gray-300 text-xs">{showTranscript ? "▲ Thu gọn" : "▼ Xem"}</span>
          </button>
          {showTranscript && (
            <div className="px-4 pb-4 border-t border-gray-50">
              <div className="mt-3 bg-gray-50 rounded-xl p-3">
                {wordErrors.length > 0 ? (
                  <HighlightedTranscript transcription={transcription} wordErrors={wordErrors} />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">{transcription}</p>
                )}
              </div>
              {wordErrors.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  Bấm vào từ tô đỏ để xem hướng dẫn phát âm
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Practice again CTA ── */}
      {pct < 0.8 && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">
            🎯 Mục tiêu: đạt ≥80% để tự tin trong kỳ thi thật
          </p>
        </div>
      )}
    </div>
  );
}
