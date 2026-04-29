import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Question } from "../../../types";
import { Button, ScorePanel } from "../../ui";
import { attemptsApi } from "../../../api";

export function FillInBlanksRW({ question }: { question: Question }) {
  type RawSeg = { text: string; isBlank: boolean; options?: string[] };
  const rawOpts = (question.options as any[]) || [];
  const isSegmentsFormat =
    rawOpts.length > 0 &&
    typeof rawOpts[0] === "object" &&
    rawOpts[0] !== null &&
    "isBlank" in rawOpts[0];

  type Segment =
    | { text: string; isBlank: false }
    | { blankIdx: number; isBlank: true; choices: string[] };

  let segments: Segment[] = [];
  let blankCount = 0;

  if (isSegmentsFormat) {
    const allChoices: string[] = [];
    rawOpts.forEach((s: RawSeg) => {
      if (s.isBlank && Array.isArray(s.options)) allChoices.push(...s.options);
    });
    rawOpts.forEach((s: RawSeg) => {
      if (!s.isBlank) {
        segments.push({ isBlank: false, text: s.text });
      } else {
        const choices = Array.isArray(s.options) && s.options.length > 0 ? s.options : allChoices;
        segments.push({ isBlank: true, blankIdx: blankCount++, choices });
      }
    });
  } else {
    const rawContent: string = (question.content as any) || "";
    const flatChoices: string[] = rawOpts.filter((o) => typeof o === "string");
    const parts = rawContent.split(/(__\d+__)/);
    parts.forEach((part) => {
      if (/^__\d+__$/.test(part)) {
        segments.push({ isBlank: true, blankIdx: blankCount++, choices: flatChoices });
      } else if (part) {
        segments.push({ isBlank: false, text: part });
      }
    });
  }

  const rawAnswers = question.correctAnswer || [];
  const correctAnswers: string[] = Array.isArray(rawAnswers)
    ? rawAnswers
    : Object.values(rawAnswers);

  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const fibDetails = (result?.scoreBreakdown?.details || {}) as Record<string, boolean>;
  const fibTotal = Object.keys(fibDetails).length || blankCount;
  const fibCorrect = Object.values(fibDetails).filter(Boolean).length;
  const normalizedBreakdown =
    result?.status === "SCORED"
      ? { content: fibCorrect, content_max: fibTotal }
      : undefined;

  const submitMutation = useMutation({
    mutationFn: () => {
      const selectedAnswers = Array.from({ length: blankCount }).map(
        (_, i) => answers[i] || "",
      );
      return attemptsApi.submitText({ questionId: question.id, selectedAnswers });
    },
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="practice-body">
      <div className="text-[15px] sm:text-base leading-[2.4] sm:leading-[2.8] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-5 shadow-inner max-h-[55vh] sm:max-h-none overflow-y-auto">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;

          const currentIdx = seg.blankIdx;
          const val = answers[currentIdx] || "";

          let selectClass =
            "mx-1 px-2 py-0.5 border-2 rounded text-sm font-semibold outline-none transition-colors cursor-pointer text-brand-black ";

          if (!submitted) {
            selectClass += val
              ? "border-brand-yellow bg-brand-yellow-soft"
              : "border-gray-300 bg-white hover:border-gray-400 focus:border-brand-yellow";
          } else {
            const isCorrect = correctAnswers[currentIdx]?.toLowerCase() === val?.toLowerCase();
            selectClass += isCorrect
              ? "border-green-400 bg-green-50 text-green-700"
              : "border-red-400 bg-red-50 text-red-700";
          }

          return (
            <select
              key={i}
              value={val}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, [currentIdx]: e.target.value }))
              }
              disabled={submitted}
              className={selectClass}
            >
              <option value="" disabled></option>
              {seg.choices.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        })}
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

      {submitted && correctAnswers.length > 0 && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">
            ✅ Đáp án đúng (Correct Answers)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {correctAnswers.map((ans, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-gray-500 text-xs mr-1">
                  Blank {idx + 1}:
                </span>
                <span className="font-bold text-green-700">{ans}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={fibCorrect}
          breakdown={normalizedBreakdown}
          feedback={result.feedback}
          maxScore={fibTotal}
        />
      )}
    </div>
  );
}
