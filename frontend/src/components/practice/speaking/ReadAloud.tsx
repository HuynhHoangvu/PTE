import React from "react";
import { Question } from "../../../types";
import { MicSection } from "../shared/MicSection";
import { PracticeContentFrame } from "../shared/PracticeContentFrame";
import { SpeakingPromptAudio } from "../shared/SpeakingPromptAudio";
import { SpeakableText } from "../shared/SpeakableText";
import { getMaxScore } from "../../../constants/scoring";

export function ReadAloud({
  question,
  attempts,
}: {
  question: Question;
  attempts: any[];
}) {
  void attempts;
  return (
    <PracticeContentFrame stepHint="Đọc đoạn → Ghi âm rõ ràng, tốc độ ổn định">
      <SpeakingPromptAudio
        question={question}
        extraEnglishParts={question.content ? [question.content] : []}
      >
        <div className="practice-passage-scroll">
          <p className="practice-prose">
            <SpeakableText text={question.content || ""} />
          </p>
        </div>
      </SpeakingPromptAudio>
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
    </PracticeContentFrame>
  );
}
