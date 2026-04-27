import React from "react";
import { clsx } from "clsx";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { MicSection } from "../shared/MicSection";

export function ReadAloud({
  question,
  attempts,
}: {
  question: Question;
  attempts: any[];
}) {
  const [started, setStarted] = React.useState(false);
  return (
    <div>
      <div className="px-3 pt-3 pb-2 sm:px-5 sm:py-5">
        <p
          className={clsx(
            "text-[15px] sm:text-base leading-snug sm:leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 select-none",
            !started && "blur-sm",
          )}
        >
          {question.content}
        </p>
      </div>
      {!started ? (
        <div className="px-3 pb-3 sm:px-5 sm:pb-5 flex justify-center">
          <Button variant="yellow" size="sm" className="sm:px-5 sm:text-sm" onClick={() => setStarted(true)}>
            ▶ Bắt đầu luyện
          </Button>
        </div>
      ) : (
        <MicSection
          questionId={question.id}
          prepSeconds={question.prepTime || 40}
          maxSeconds={question.responseTime || 40}
          label="Chạm nút mic vàng để ghi; hoặc đợi hết thời chuẩn bị sẽ tự ghi."
          originalText={question.content}
          maxScore={15}
          wordComparisonStatus={
            question.content ? "enabled" : "required_but_missing"
          }
        />
      )}
    </div>
  );
}
