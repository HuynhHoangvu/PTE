import React from "react";
import { Question } from "../../../types";
import { MicSection } from "../shared/MicSection";
import { getMaxScore } from "../../../constants/scoring";

export function ReadAloud({
  question,
  attempts,
}: {
  question: Question;
  attempts: any[];
}) {
  return (
    <div>
      <div className="px-3 pt-3 pb-2 sm:px-5 sm:py-5">
        <p className="text-[15px] sm:text-base leading-snug sm:leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 select-none">
          {question.content}
        </p>
      </div>
      <MicSection
        questionId={question.id}
        prepSeconds={question.prepTime || 40}
        maxSeconds={question.responseTime || 40}
        label="Hệ thống tự đếm ngược rồi ghi âm · bấm 🎙️ để ghi ngay không cần chờ"
        originalText={question.content}
        maxScore={getMaxScore(question.type)}
        wordComparisonStatus={
          question.content ? "enabled" : "required_but_missing"
        }
      />
    </div>
  );
}
