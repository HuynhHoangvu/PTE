import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { attemptsApi } from "../../../api";
import { parseReadingFibDrag } from "../../../utils/readingFibDrag";

export function FillInBlanksReading({ question }: { question: Question }) {
  const { segments: fibSegs, wordBank: allChoices } = parseReadingFibDrag(question);

  type Seg = { text: string; isBlank: false } | { blankId: string; isBlank: true };
  const segments: Seg[] = fibSegs.map((s) =>
    s.kind === "text"
      ? { isBlank: false, text: s.text }
      : { isBlank: true, blankId: s.id },
  );

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [available, setAvailable] = React.useState<string[]>(allChoices);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const fibDetails = (result?.scoreBreakdown?.details || {}) as Record<string, boolean>;
  const fibTotal = Object.keys(fibDetails).length;
  const fibCorrect = Object.values(fibDetails).filter(Boolean).length;

  const fillBlank = (blankId: string, word: string) => {
    const prev = answers[blankId];
    if (prev) setAvailable((p) => [...p, prev]);
    setAnswers((p) => ({ ...p, [blankId]: word }));
    setAvailable((p) => p.filter((w) => w !== word));
  };

  const clearBlank = (blankId: string) => {
    const word = answers[blankId];
    if (word) {
      setAvailable((p) => [...p, word]);
      setAnswers((p) => { const n = { ...p }; delete n[blankId]; return n; });
    }
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: answers,
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="practice-body">
      <div className="text-[15px] sm:text-base leading-[2] sm:leading-[2.2] text-gray-800 max-h-[48vh] sm:max-h-none overflow-y-auto pr-1">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;
          const id = seg.blankId;
          const val = answers[id];
          return (
            <span
              key={i}
              onClick={() => val && clearBlank(id)}
              className={clsx(
                "inline-flex items-center min-w-[76px] sm:min-w-[110px] mx-0.5 sm:mx-1 px-1.5 sm:px-2 py-0.5 border-b-2 rounded cursor-pointer text-xs sm:text-sm font-medium transition-colors",
                val
                  ? "border-brand-yellow bg-brand-yellow-light text-brand-black"
                  : "border-gray-400 bg-gray-50 text-gray-400",
              )}
            >
              {val || "      "}
              {val && <span className="ml-1 text-gray-400 text-xs">✕</span>}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-32 sm:max-h-none overflow-y-auto">
        {available.map((w) => (
          <button
            key={w}
            onClick={() => {
              const firstEmpty = segments.find(
                (s) => s.isBlank && !answers[s.blankId],
              );
              if (firstEmpty && firstEmpty.isBlank) fillBlank(firstEmpty.blankId, w);
            }}
            className="px-2.5 py-1.5 sm:px-3 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:border-brand-yellow hover:bg-brand-yellow-soft transition-colors"
          >
            {w}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submitMutation.mutate()}
          disabled={submitted}
        >
          Chấm điểm
        </Button>
      </div>

      {submitted && question.correctAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">
            ✅ Đáp án đúng (Correct Answers)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(
              question.correctAnswer as Record<string, string>,
            ).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="text-gray-500 text-xs mr-1">Blank {k}:</span>
                <span className="font-bold text-green-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3">
          {fibTotal > 0 && (
            <p className="text-sm font-black text-brand-orange mb-1">
              Điểm: {fibCorrect}/{fibTotal} blanks
            </p>
          )}
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
