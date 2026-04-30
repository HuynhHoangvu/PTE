import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { AITutorPanel } from "../shared/AITutorPanel";
import { attemptsApi } from "../../../api";

const MIN_WORDS = 200;
const MAX_WORDS = 300;
const TIME_LIMIT = 1200;

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function WriteEssay({ question }: { question: Question }) {
  const [answer, setAnswer] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(TIME_LIMIT);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [keyboardUp, setKeyboardUp] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const wordCount = answer.trim() === "" ? 0 : answer.trim().split(/\s+/).filter(Boolean).length;
  const wordOk = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const wordWarn = wordCount > MAX_WORDS;

  React.useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  // Detect keyboard open via visualViewport
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const ratio = vv.height / window.innerHeight;
      setKeyboardUp(ratio < 0.75);
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, textAnswer: answer }),
    onSuccess: async (data) => {
      setSubmitted(true);
      textareaRef.current?.blur();
      let tries = 0;
      const poll = async () => {
        const r = await attemptsApi.pollScore(data.id);
        if (r.status === "SCORED" || r.status === "ERROR") { setResult(r); return; }
        if (++tries < 20) setTimeout(poll, 2000);
      };
      poll();
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const wordColor = wordWarn
    ? "text-red-500"
    : wordOk
    ? "text-green-600"
    : "text-gray-500";

  return (
    <div className="practice-body">
      {/* Prompt */}
      {question.content && (
        <div className="practice-passage-scroll max-h-[32vh]">
          <p className="practice-prose">{question.content}</p>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <p className="text-xs font-bold text-gray-700 mb-1.5">Bài làm của bạn</p>
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          rows={keyboardUp ? 6 : 10}
          className="w-full border border-gray-200 rounded-xl p-3 text-[15px] text-gray-800 resize-none focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 disabled:bg-gray-50"
          placeholder="Viết essay tại đây... (200–300 từ)"
        />

        {/* Sticky toolbar — dính sát trên bàn phím */}
        <div
          className={clsx(
            "sticky bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg transition-all duration-200 mt-1",
            keyboardUp && "shadow-2xl border-brand-gold/30"
          )}
        >
          {/* Word count */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className={clsx("font-display font-black text-base leading-none", wordColor)}>{wordCount}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">/ {MAX_WORDS} từ</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            {/* Word range indicator */}
            <div className="flex items-center gap-1">
              <div className={clsx("w-2 h-2 rounded-full", wordCount < MIN_WORDS ? "bg-gray-300" : "bg-green-500")} />
              <p className="text-[10px] text-gray-500">{MIN_WORDS}+</p>
            </div>
          </div>

          {/* Timer + submit */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className={clsx(
                "font-display font-bold text-sm leading-none",
                timeLeft < 120 ? "text-red-500 animate-pulse" : "text-gray-700"
              )}>
                {fmt(timeLeft)}
              </p>
              <p className="text-[9px] text-gray-400 mt-0.5">còn lại</p>
            </div>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={!wordOk || submitted || submitMutation.isPending}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97]",
                wordOk && !submitted
                  ? "bg-brand-gold text-white shadow-gold-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {submitMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : "Nộp bài"}
            </button>
          </div>
        </div>
      </div>

      {/* Word count guidance */}
      {!submitted && (
        <div className="flex gap-2 text-[11px] text-gray-400">
          <span className={wordCount >= MIN_WORDS ? "text-green-600 font-bold" : ""}>✓ Tối thiểu {MIN_WORDS} từ</span>
          <span>·</span>
          <span className={wordWarn ? "text-red-500 font-bold" : ""}>✗ Tối đa {MAX_WORDS} từ</span>
        </div>
      )}

      {/* Sample answer */}
      {submitted && question.suggestedAnswer && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1.5">💡 Sample Answer</p>
          <div className="text-sm text-green-900 leading-relaxed whitespace-pre-wrap">{question.suggestedAnswer}</div>
        </div>
      )}

      {result?.status === "ERROR" && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-red-600 font-bold mb-1">❌ Chấm điểm thất bại</p>
          <p className="text-sm text-red-500">Vui lòng thử lại.</p>
        </div>
      )}

      {result?.status === "SCORED" && (
        <AITutorPanel
          totalScore={result.totalScore}
          maxScore={26}
          feedback={result.feedback}
          tutorTip={result.tutorTip}
          breakdown={result.scoreBreakdown}
          vocabSuggestions={result.vocabSuggestions || []}
          mode="writing"
        />
      )}
    </div>
  );
}
