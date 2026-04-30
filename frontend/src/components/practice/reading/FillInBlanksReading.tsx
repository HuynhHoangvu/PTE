import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { attemptsApi } from "../../../api";
import { parseReadingFibDrag } from "../../../utils/readingFibDrag";

type Seg = { text: string; isBlank: false } | { blankId: string; isBlank: true };

// ── Bottom Sheet for word selection ──────────────────────────────────────────
function WordPickerSheet({
  blankId, words, onSelect, onClear, hasCurrent, onClose,
}: {
  blankId: string; words: string[]; onSelect: (w: string) => void;
  onClear: () => void; hasCurrent: boolean; onClose: () => void;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "60vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <p className="font-bold text-sm text-gray-900">Chọn từ điền vào ô trống</p>
          <button onClick={onClose} className="text-gray-400 text-xl active:opacity-70">✕</button>
        </div>

        {/* Words */}
        <div className="px-5 pb-safe overflow-y-auto" style={{ maxHeight: "45vh" }}>
          <div className="flex flex-wrap gap-2 pb-4">
            {words.map((w) => (
              <button
                key={w}
                onClick={() => { onSelect(w); onClose(); }}
                className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-semibold text-amber-900 active:scale-[0.97] active:bg-amber-100 transition-all"
              >
                {w}
              </button>
            ))}
            {words.length === 0 && (
              <p className="text-sm text-gray-400 py-4 w-full text-center">Không còn từ nào trong ngân hàng</p>
            )}
          </div>
          {hasCurrent && (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="w-full py-3 mb-4 rounded-2xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 active:scale-[0.97] transition-all"
            >
              🗑️ Xóa từ hiện tại
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function FillInBlanksReading({ question }: { question: Question }) {
  const { segments: fibSegs, wordBank: allChoices } = parseReadingFibDrag(question);

  const segments: Seg[] = fibSegs.map((s) =>
    s.kind === "text"
      ? { isBlank: false, text: s.text }
      : { isBlank: true, blankId: s.id },
  );

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [available, setAvailable] = React.useState<string[]>(allChoices);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [activeBlank, setActiveBlank] = React.useState<string | null>(null);
  const qc = useQueryClient();

  const fibDetails = (result?.scoreBreakdown?.details || {}) as Record<string, boolean>;
  const fibTotal = Object.keys(fibDetails).length;
  const fibCorrect = Object.values(fibDetails).filter(Boolean).length;

  const fillBlank = (blankId: string, word: string) => {
    if (submitted) return;
    const prev = answers[blankId];
    if (prev) setAvailable((p) => [...p, prev]);
    setAnswers((p) => ({ ...p, [blankId]: word }));
    setAvailable((p) => p.filter((w) => w !== word));
  };

  const clearBlank = (blankId: string) => {
    if (submitted) return;
    const word = answers[blankId];
    if (word) {
      setAvailable((p) => [...p, word]);
      setAnswers((p) => { const n = { ...p }; delete n[blankId]; return n; });
    }
  };

  const openSheet = (blankId: string) => {
    if (submitted) return;
    setActiveBlank(blankId);
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, selectedAnswers: answers }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const totalBlanks = segments.filter((s) => s.isBlank).length;
  const filledBlanks = Object.keys(answers).length;

  return (
    <div className="practice-body">
      {/* Reading passage with inline blanks */}
      <div className="text-[15px] leading-[2.2] text-gray-800 max-h-[52vh] overflow-y-auto pr-1">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;

          const id = seg.blankId;
          const val = answers[id];
          const correct = fibDetails[id];
          const showResult = submitted && fibDetails.hasOwnProperty(id);

          return (
            <button
              key={i}
              onClick={() => openSheet(id)}
              disabled={submitted}
              className={clsx(
                "inline-flex items-center gap-1 mx-0.5 px-2.5 py-0.5 border-b-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] min-w-[80px] justify-center",
                submitted
                  ? showResult
                    ? correct
                      ? "border-green-400 bg-green-50 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-300 bg-gray-100 text-gray-700"
                  : val
                  ? "border-brand-gold bg-amber-50 text-amber-900 shadow-sm"
                  : "border-gray-300 bg-white text-gray-400 border-dashed"
              )}
            >
              {val || <span className="text-gray-300">___</span>}
              {val && !submitted && <span className="text-gray-300 text-xs">▼</span>}
              {submitted && showResult && (
                <span className="text-xs">{correct ? "✓" : "✗"}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {!submitted && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gold rounded-full transition-all duration-500"
              style={{ width: `${(filledBlanks / totalBlanks) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 font-medium flex-shrink-0">{filledBlanks}/{totalBlanks}</p>
        </div>
      )}

      {/* Instruction hint */}
      {!submitted && filledBlanks < totalBlanks && (
        <p className="text-xs text-gray-400 text-center">
          👆 Bấm vào ô trống để chọn từ
        </p>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={() => submitMutation.mutate()}
          disabled={filledBlanks === 0 || submitMutation.isPending}
          className={clsx(
            "w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]",
            filledBlanks > 0 && !submitMutation.isPending
              ? "bg-brand-gold text-white shadow-gold-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {submitMutation.isPending
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                Đang chấm điểm...
              </span>
            : `Chấm điểm ${filledBlanks}/${totalBlanks} ô đã điền`}
        </button>
      )}

      {/* Correct answers after submit */}
      {submitted && question.correctAnswer && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">✅ Đáp án đúng</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(question.correctAnswer as Record<string, string>).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="text-gray-400 text-xs mr-1">Blank {k}:</span>
                <span className="font-bold text-green-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="font-display font-black text-2xl text-amber-900">{fibCorrect}/{fibTotal}</p>
          <p className="text-xs text-amber-700 font-medium">ô đúng</p>
          {result.feedback && <p className="text-sm text-amber-800 mt-2">{result.feedback}</p>}
        </div>
      )}

      {/* Bottom Sheet */}
      {activeBlank && (
        <WordPickerSheet
          blankId={activeBlank}
          words={available}
          hasCurrent={!!answers[activeBlank]}
          onSelect={(w) => fillBlank(activeBlank, w)}
          onClear={() => clearBlank(activeBlank)}
          onClose={() => setActiveBlank(null)}
        />
      )}
    </div>
  );
}
