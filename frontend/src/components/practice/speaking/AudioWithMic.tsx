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
  // readyToRecord = true khi không có audio HOẶC audio đã phát xong
  const [audioEnded, setAudioEnded] = React.useState(!question.audioUrl);

  // Reset khi đổi câu
  React.useEffect(() => {
    setAudioEnded(!question.audioUrl);
  }, [question.id, question.audioUrl]);

  const isSGD = question.type === "SPEAKING_SUMMARISE_GROUP_DISCUSSION";

  return (
    <div className="practice-body">
      {/* Transcript SGD */}
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
                <p key={i} className="text-[14px] sm:text-sm text-purple-900 leading-snug sm:leading-relaxed">
                  {line}
                </p>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Audio player */}
      {question.audioUrl && (
        <div className="space-y-1">
          <AudioPlayer
            src={question.audioUrl}
            countdownSeconds={5}
            onEnded={() => setAudioEnded(true)}
            showSpeedControl
          />
          {!audioEnded && (
            <p className="text-[11px] text-gray-400 text-center">
              Nghe xong → mic tự động bắt đầu · hoặc{" "}
              <button
                className="text-brand-gold font-bold underline"
                onClick={() => setAudioEnded(true)}
              >
                bỏ qua và ghi ngay
              </button>
            </p>
          )}
        </div>
      )}

      {/*
        MicSection LUÔN hiển thị — không ẩn dù đang phát audio.
        autoStart=audioEnded: khi audio kết thúc mới auto-countdown.
        Nhưng user vẫn có thể bấm mic thủ công bất kỳ lúc nào.
      */}
      <MicSection
        questionId={question.id}
        prepSeconds={question.prepTime || 0}
        maxSeconds={question.responseTime || 40}
        autoStart={audioEnded}
        label={
          audioEnded
            ? "Hệ thống tự đếm ngược rồi ghi âm · bấm mic để ghi ngay"
            : "Bấm 🎙️ để ghi ngay · hoặc chờ audio kết thúc sẽ tự động bắt đầu"
        }
        maxScore={maxScore}
        wordComparisonStatus="disabled"
        suggestedAnswer={
          question.suggestedAnswer ||
          (typeof question.correctAnswer === "string"
            ? question.correctAnswer
            : Array.isArray(question.correctAnswer) &&
                question.correctAnswer.every((v: any) => typeof v === "string")
              ? question.correctAnswer.join(" / ")
              : undefined)
        }
      />
    </div>
  );
}
