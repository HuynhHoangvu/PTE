import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { AudioPlayer, Button } from "../../ui";
import { attemptsApi } from "../../../api";
import { PracticeContentFrame } from "../shared/PracticeContentFrame";

export function HighlightIncorrectWords({ question }: { question: Question }) {
  const words = (question.content || "").split(/(\s+)/);
  const [highlighted, setHighlighted] = React.useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const toggle = (idx: number, word: string) => {
    if (submitted || !word.trim()) return;
    setHighlighted((p) => {
      const n = new Set(p);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const selectedWords = [...highlighted]
        .map((idx) => words[idx].trim())
        .filter(Boolean);
      return attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: selectedWords,
      });
    },
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const correctAnswers = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.map((w: string) =>
        w.toLowerCase().replace(/[^a-z0-9]/g, ""),
      )
    : [];

  return (
    <PracticeContentFrame stepHint="Nghe audio → Chạm các từ sai trong bản ghi">
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 sm:p-3">
        <AudioPlayer
          src={question.audioUrl}
          countdownSeconds={5}
          showSpeedControl
        />
      </div>
      <div className="text-[14px] sm:text-sm leading-relaxed sm:leading-[2] text-gray-800 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 select-none max-h-[50vh] sm:max-h-none overflow-y-auto">
        {words.map((word, idx) => {
          if (!word.trim()) return <span key={idx}>{word}</span>;
          const isH = highlighted.has(idx);

          let extraClass = isH
            ? "bg-brand-yellow text-brand-black"
            : "hover:bg-gray-200";
          if (submitted) {
            const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, "");
            const isActualWrongWord = correctAnswers.includes(normalized);

            if (isH && isActualWrongWord)
              extraClass =
                "bg-green-200 text-green-900 border-b-2 border-green-500 font-bold";
            if (isH && !isActualWrongWord)
              extraClass = "bg-red-200 text-red-900 font-bold line-through";
            if (!isH && isActualWrongWord)
              extraClass =
                "bg-green-50 text-green-700 border-b-2 border-green-500 border-dashed font-bold";
            if (!isH && !isActualWrongWord) extraClass = "";
          }

          return (
            <span
              key={idx}
              onClick={() => toggle(idx, word)}
              className={clsx(
                "cursor-pointer rounded px-0.5 transition-colors",
                extraClass,
              )}
            >
              {word}
            </span>
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
      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </PracticeContentFrame>
  );
}
