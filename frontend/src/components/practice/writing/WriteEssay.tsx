import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { Button, ScorePanel } from "../../ui";
import { attemptsApi } from "../../../api";

export function WriteEssay({ question }: { question: Question }) {
  const [answer, setAnswer] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(1200);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const paragraphCount = answer.split(/\n\n+/).filter((p) => p.trim()).length;
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  React.useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, textAnswer: answer }),
    onSuccess: async (data) => {
      setSubmitted(true);
      let tries = 0;
      const poll = async () => {
        const r = await attemptsApi.pollScore(data.id);
        if (r.status === "SCORED" || r.status === "ERROR") {
          setResult(r);
          return;
        }
        if (++tries < 20) setTimeout(poll, 2000);
      };
      poll();
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="practice-body">
      {question.content && (
        <div className="practice-passage-scroll max-h-[36vh] sm:max-h-60">
          <p className="practice-prose">
            {question.content}
          </p>
        </div>
      )}
      <div>
        <p className="text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Bài làm của bạn</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          rows={10}
          className="w-full border border-gray-200 rounded-xl p-3 sm:p-4 text-[15px] sm:text-sm text-gray-800 resize-y min-h-[12rem] sm:min-h-[18rem] focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 disabled:bg-gray-50"
          placeholder="Viết bài essay tại đây..."
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mt-2">
          <span className="text-[11px] sm:text-xs text-gray-400 order-2 sm:order-1">
            {wordCount}/300 từ · {paragraphCount} đoạn
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end w-full sm:w-auto order-1 sm:order-2">
            <span className="text-xs text-gray-500">
              Còn lại{" "}
              <span
                className={clsx(
                  "font-bold",
                  timeLeft < 120 ? "text-red-500" : "text-brand-orange",
                )}
              >
                {fmt(timeLeft)}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={wordCount < 50 || submitted || submitMutation.isPending}
            >
              {submitMutation.isPending ? "Đang chấm…" : "Chấm điểm"}
            </Button>
          </div>
        </div>
      </div>

      {submitted && question.suggestedAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1.5 flex items-center gap-1.5">
            💡 Sample Answer
          </p>
          <div className="text-sm text-green-900 leading-relaxed whitespace-pre-wrap">
            {question.suggestedAnswer}
          </div>
        </div>
      )}

      {result?.status === "ERROR" && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-red-600 font-bold mb-1">❌ Chấm điểm thất bại</p>
          <p className="text-sm text-red-500">
            Hệ thống AI không thể chấm điểm bài làm này. Vui lòng thử lại.
          </p>
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={result.totalScore}
          breakdown={result.scoreBreakdown}
          feedback={result.feedback}
          maxScore={26}
        />
      )}
    </div>
  );
}
