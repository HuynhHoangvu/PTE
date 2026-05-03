import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { attemptsApi } from "../../../api";
import { PracticeContentFrame } from "../shared/PracticeContentFrame";

export function ReorderParagraphs({ question }: { question: Question }) {
  const options: { label: string; text: string }[] = question.options || [];
  const [source, setSource] = React.useState(options);
  const [target, setTarget] = React.useState<typeof options>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: target.map((t) => t.label),
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const moveToTarget = (item: (typeof options)[0]) => {
    if (submitted) return;
    setSource((p) => p.filter((x) => x.label !== item.label));
    setTarget((p) => [...p, item]);
  };

  const moveToSource = (item: (typeof options)[0]) => {
    if (submitted) return;
    setTarget((p) => p.filter((x) => x.label !== item.label));
    setSource((p) => [...p, item]);
  };

  return (
    <PracticeContentFrame stepHint="Ghép các đoạn theo đúng thứ tự logic">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2 sm:mb-4">
        <div>
          <p className="text-[11px] font-bold text-gray-500 mb-1.5 sm:mb-2 uppercase tracking-wide">
            Đoạn gốc
          </p>
          <div className="space-y-2 min-h-24 sm:min-h-32 border-2 border-dashed border-gray-200 rounded-xl p-2">
            {source.map((item) => (
              <div
                key={item.label}
                onClick={() => moveToTarget(item)}
                className="flex gap-2 bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3 cursor-pointer hover:border-brand-yellow hover:bg-brand-yellow-soft transition-all text-xs sm:text-sm"
              >
                <span className="text-xs font-black text-gray-400 mt-0.5 flex-shrink-0">
                  {item.label}
                </span>
                <span className="text-gray-800 text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-500 mb-1.5 sm:mb-2 uppercase tracking-wide">
            Thứ tự của bạn
          </p>
          <div className="space-y-2 min-h-24 sm:min-h-32 border-2 border-dashed border-brand-yellow/40 rounded-xl p-2 bg-brand-yellow-soft/30">
            {target.length === 0 && (
              <div className="flex items-center justify-center h-24 sm:h-28 text-gray-400 text-xs sm:text-sm">
                <span>+ Chạm đoạn bên trái để xếp vào đây</span>
              </div>
            )}
            {target.map((item, idx) => (
              <div
                key={item.label}
                onClick={() => moveToSource(item)}
                className="flex gap-2 bg-white border border-brand-yellow rounded-lg p-2.5 sm:p-3 cursor-pointer hover:bg-brand-yellow-light transition-all text-xs sm:text-sm"
              >
                <span className="text-xs font-black text-brand-orange mt-0.5 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-gray-800 text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submitMutation.mutate()}
          disabled={target.length === 0 || submitted || submitMutation.isPending}
        >
          Chấm điểm
        </Button>
      </div>

      {submitted && question.correctAnswer && (
        <div className="mt-3 bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs font-black uppercase tracking-widest text-green-500 mb-2">
            ✅ Thứ tự đúng (Correct Order)
          </p>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(question.correctAnswer)
              ? question.correctAnswer
              : []
            ).map((label: string, i: number) => (
              <span
                key={label}
                className="text-sm font-bold bg-white text-green-700 px-2 py-1 rounded border border-green-200"
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <div className="mt-3 bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </PracticeContentFrame>
  );
}
