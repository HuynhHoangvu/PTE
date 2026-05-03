import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { attemptsApi } from "../../../api";
import { PracticeContentFrame } from "../shared/PracticeContentFrame";

export function MCQuestion({
  question,
  multiple = false,
}: {
  question: Question;
  multiple?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const options: { label: string; text: string }[] = question.options || [];

  const toggle = (label: string) => {
    if (submitted) return;
    if (multiple) {
      setSelected((p) =>
        p.includes(label) ? p.filter((x) => x !== label) : [...p, label],
      );
    } else {
      setSelected([label]);
    }
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: multiple ? selected : selected[0],
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const correctAnswers: string[] = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.filter((x: any) => typeof x === "string")
    : typeof question.correctAnswer === "string"
      ? [question.correctAnswer]
      : [];

  return (
    <PracticeContentFrame
      stepHint={
        multiple ? "Chọn tất cả đáp án đúng" : "Chọn một đáp án"
      }
    >
      {question.content && (
        <div className="practice-passage-scroll">
          <p className="practice-prose">
            {question.content}
          </p>
        </div>
      )}
      {question.title &&
        !["need help", "need help?", "help"].includes(
          question.title.toLowerCase(),
        ) && (
          <p className="text-[15px] sm:text-sm font-bold text-gray-800 leading-snug">{question.title}</p>
        )}
      <div className="space-y-2 sm:space-y-2.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          const isCorrect = submitted && correctAnswers.includes(opt.label);
          const isWrong =
            submitted && isSelected && !correctAnswers.includes(opt.label);
          return (
            <label
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={clsx(
                "flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all",
                isCorrect
                  ? "border-green-400 bg-green-50"
                  : isWrong
                    ? "border-red-400 bg-red-50"
                    : isSelected
                      ? "border-brand-yellow bg-brand-yellow-soft"
                      : "border-gray-200 bg-white hover:border-brand-yellow hover:bg-brand-yellow-soft/50",
              )}
            >
              {multiple ? (
                <div
                  className={clsx(
                    "w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
                    isSelected
                      ? "bg-brand-yellow border-brand-yellow"
                      : "border-gray-300",
                  )}
                >
                  {isSelected && (
                    <span className="text-[8px] font-black">✓</span>
                  )}
                </div>
              ) : (
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
                    isSelected ? "border-brand-yellow" : "border-gray-300",
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-brand-yellow" />
                  )}
                </div>
              )}
              <div className="flex gap-2 flex-1">
                <span className="text-xs font-black text-gray-400 mt-0.5">
                  {opt.label}
                </span>
                <span className="text-[14px] sm:text-sm text-gray-800 leading-snug">{opt.text}</span>
              </div>
              {isCorrect && <span className="text-green-500 text-sm">✓</span>}
              {isWrong && <span className="text-red-500 text-sm">✗</span>}
              {submitted &&
                !isSelected &&
                correctAnswers.includes(opt.label) && (
                  <span className="text-green-600 text-[10px] font-bold bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider">
                    Đáp án đúng
                  </span>
                )}
            </label>
          );
        })}
      </div>
      {!submitted && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={selected.length === 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Đang chấm…" : "Chấm điểm"}
          </Button>
        </div>
      )}
      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </PracticeContentFrame>
  );
}
