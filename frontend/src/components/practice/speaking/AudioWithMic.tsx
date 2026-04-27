import React from "react";
import { Question } from "../../../types";
import { AudioPlayer } from "../../ui";
import { MicSection } from "../shared/MicSection";

export function AudioWithMic({
  question,
  maxScore = 90,
}: {
  question: Question;
  maxScore?: number;
}) {
  const isRTS = question.type === "SPEAKING_RESPOND_TO_SITUATION";
  const isSGD = question.type === "SPEAKING_SUMMARISE_GROUP_DISCUSSION";
  return (
    <div className="practice-body">
      {isRTS && question.content && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
            📋 Tình huống
          </p>
          <p className="practice-prose text-amber-900">
            {question.content}
          </p>
        </div>
      )}
      {isSGD && !question.audioUrl && question.content && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-3 sm:px-4 sm:py-4 max-h-[42vh] sm:max-h-none overflow-y-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2 sm:mb-3">
            🗣️ Băng thoại thảo luận
          </p>
          <div className="space-y-1.5">
            {question.content.split("\n").map((line, i) => {
              const match = line.match(/^\[(.+?)\]\s*(.*)/);
              if (match) {
                return (
                  <p key={i} className="text-[14px] sm:text-sm text-purple-900 leading-snug sm:leading-relaxed">
                    <span className="font-bold text-purple-700">[{match[1]}]</span>{" "}
                    {match[2]}
                  </p>
                );
              }
              return line.trim() ? (
                <p key={i} className="text-[14px] sm:text-sm text-purple-900 leading-snug sm:leading-relaxed">{line}</p>
              ) : null;
            })}
          </div>
        </div>
      )}
      {question.audioUrl && (
        <AudioPlayer
          src={question.audioUrl}
          countdownSeconds={5}
          showSpeedControl
        />
      )}
      <MicSection
        questionId={question.id}
        prepSeconds={question.prepTime || 0}
        maxSeconds={question.responseTime || 40}
        label="Sau khi nghe xong: chạm mic vàng, hoặc đợi hệ thống tự bắt đầu ghi."
        maxScore={maxScore}
        wordComparisonStatus="disabled"
        suggestedAnswer={
          question.suggestedAnswer ||
          (typeof question.correctAnswer === "string"
            ? question.correctAnswer
            : Array.isArray(question.correctAnswer) &&
                question.correctAnswer.every(
                  (v: any) => typeof v === "string",
                )
              ? question.correctAnswer.join(" / ")
              : undefined)
        }
      />
    </div>
  );
}
