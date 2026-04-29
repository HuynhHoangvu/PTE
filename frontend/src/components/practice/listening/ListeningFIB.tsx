import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Question } from "../../../types";
import { AudioPlayer, Button } from "../../ui";
import { attemptsApi } from "../../../api";
import { parseListeningFibSegments } from "../../../utils/listeningFibSegments";

export function ListeningFIB({ question }: { question: Question }) {
  const segments = parseListeningFibSegments(question);

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const fibDetails = (result?.scoreBreakdown?.details || {}) as Record<string, boolean>;
  const fibTotal = Object.keys(fibDetails).length;
  const fibCorrect = Object.values(fibDetails).filter(Boolean).length;

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

  let blankSeq = 0;
  return (
    <div className="practice-body">
      <AudioPlayer
        src={question.audioUrl}
        countdownSeconds={7}
        showSpeedControl
      />
      <div className="text-[15px] sm:text-base leading-[2.2] sm:leading-[2.5] text-gray-800 max-h-[45vh] sm:max-h-none overflow-y-auto pr-1">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;
          const id = String(++blankSeq);
          return (
            <input
              key={i}
              value={answers[id] || ""}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, [id]: e.target.value }))
              }
              disabled={submitted}
              className="inline-block mx-0.5 sm:mx-1 px-1.5 sm:px-2 py-0.5 border-b-2 border-gray-400 focus:border-brand-yellow outline-none bg-transparent text-xs sm:text-sm min-w-[4.5rem] sm:min-w-[100px] text-brand-black font-medium"
            />
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

      {submitted && question.correctAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">
            ✅ Đáp án đúng (Correct Answers)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(Array.isArray(question.correctAnswer)
              ? question.correctAnswer
              : Object.values(question.correctAnswer as Record<string, string>)
            ).map((v: string, i: number) => (
              <div key={i} className="text-sm">
                <span className="text-gray-500 text-xs mr-1">Blank {i + 1}:</span>
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
