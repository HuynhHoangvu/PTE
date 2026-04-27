import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ScorePanel, Waveform } from "../../ui";
import { useRecorder } from "../../../hooks/useRecorder";
import { attemptsApi } from "../../../api";
import { WordComparison } from "./WordComparison";

export interface MicSectionProps {
  questionId: string;
  prepSeconds?: number;
  maxSeconds?: number;
  label?: string;
  originalText?: string;
  maxScore?: number;
  wordComparisonStatus?: "required_but_missing" | "enabled" | "disabled";
  suggestedAnswer?: string;
}

export function MicSection({
  questionId,
  prepSeconds = 0,
  maxSeconds = 40,
  label,
  originalText,
  maxScore = 90,
  wordComparisonStatus = "disabled",
  suggestedAnswer,
}: MicSectionProps) {
  const qc = useQueryClient();
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [scoreResult, setScoreResult] = React.useState<any>(null);

  const submitMutation = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) =>
      attemptsApi.submitSpeaking(questionId, blob, duration),
    onSuccess: (data) => {
      setAttemptId(data.id);
      pollForScore(data.id);
      qc.invalidateQueries({ queryKey: ["attempts", questionId] });
    },
  });

  const pollForScore = async (id: string) => {
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const result = await attemptsApi.pollScore(id);
        setScoreResult(result);
        if (result.status === "SCORED" || result.status === "ERROR") {
          qc.invalidateQueries({ queryKey: ["attempts", questionId] });
          return;
        }
        if (tries < 30) setTimeout(poll, 2000);
      } catch {}
    };
    poll();
  };

  const {
    state,
    countdown,
    elapsed,
    audioUrl,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder({
    prepSeconds,
    maxSeconds,
    onStop: (blob, duration) => submitMutation.mutate({ blob, duration }),
  });

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="px-3 py-3 sm:px-5 sm:py-5 max-md:pb-4">
      {state === "idle" && prepSeconds > 0 && (
        <p className="text-xs sm:text-sm text-gray-600 text-center mb-3 sm:mb-4 leading-snug px-1">
          Ghi âm sẽ bắt đầu sau{" "}
          <span className="text-brand-gold font-bold tabular-nums">
            {formatTime(prepSeconds)}
          </span>
          <span className="hidden sm:inline"> (bấm mic để ghi sớm)</span>
        </p>
      )}
      {state === "countdown" && (
        <p className="text-xs sm:text-sm text-center text-gray-600 mb-3 sm:mb-4 leading-snug">
          Bắt đầu sau{" "}
          <span className="text-brand-gold font-bold tabular-nums">
            {formatTime(countdown)}
          </span>
        </p>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 py-3 sm:py-4 mb-3 sm:mb-4 flex flex-col items-center px-2">
        <Waveform active={state === "recording"} />
        {state === "recording" && (
          <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] sm:text-xs text-gray-500 tabular-nums">
              {formatTime(elapsed)} / {formatTime(maxSeconds)}
            </span>
          </div>
        )}
        {state === "idle" || state === "stopped" ? (
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 text-center px-2 leading-snug max-sm:line-clamp-2">
            {label || "Chạm nút mic bên dưới để ghi âm"}
          </p>
        ) : null}
      </div>

      <div className="flex justify-center items-end gap-4 sm:gap-6 max-md:mb-2">
        {state !== "recording" && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={reset}
              disabled={state === "countdown"}
              className="w-11 h-11 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              🔄
            </button>
            <span className="text-[10px] font-semibold text-gray-400">
              Reset
            </span>
          </div>
        )}

        {state === "idle" || state === "countdown" ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={startRecording}
              disabled={state === "countdown"}
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg transition-all",
                state === "countdown"
                  ? "bg-gray-200 cursor-wait"
                  : "bg-brand-gold hover:bg-brand-gold-bright hover:scale-105 shadow-[0_4px_16px_rgba(13,148,136,0.35)]",
              )}
            >
              🎙️
            </button>
            <span className="text-[10px] font-bold text-amber-900">
              Click to record
            </span>
          </div>
        ) : state === "recording" ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-2xl hover:bg-red-50 transition-colors"
            >
              ⏹️
            </button>
            <span className="text-[10px] font-bold text-red-500">Stop</span>
          </div>
        ) : null}

        {state === "stopped" && !submitMutation.isPending && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center text-lg">
              ✅
            </div>
            <span className="text-[10px] font-bold text-green-600">
              Submitted
            </span>
          </div>
        )}
      </div>

      {submitMutation.isPending && (
        <div className="mt-4 text-center text-sm text-gray-400 animate-pulse">
          AI đang chấm điểm…
        </div>
      )}
      {scoreResult && (
        <div className="mt-4 space-y-3">
          {scoreResult.transcription && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1.5">
                📝 Bản lời nhận dạng (AI Transcription)
              </p>
              <p className="text-sm text-blue-900 italic leading-relaxed">
                "{scoreResult.transcription}"
              </p>
            </div>
          )}
          {scoreResult.transcription &&
            scoreResult.status === "SCORED" &&
            wordComparisonStatus === "enabled" &&
            originalText && (
              <WordComparison
                original={originalText}
                transcription={scoreResult.transcription}
              />
            )}
          {scoreResult.transcription &&
            wordComparisonStatus === "required_but_missing" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-900">
                Chưa có <strong>câu gốc</strong> trong database (điền{" "}
                <code className="text-xs bg-white/80 px-1 rounded">
                  correctAnswer
                </code>{" "}
                hoặc{" "}
                <code className="text-xs bg-white/80 px-1 rounded">
                  suggestedAnswer
                </code>
                ) — không thể so sánh từng từ.
              </div>
            )}
          {scoreResult.status === "SCORED" && (
            <ScorePanel
              totalScore={scoreResult.totalScore}
              breakdown={scoreResult.scoreBreakdown}
              feedback={scoreResult.feedback}
              maxScore={maxScore}
            />
          )}
          {scoreResult.status === "SCORED" && suggestedAnswer && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">
                💡 Gợi ý câu trả lời
              </h4>
              <p className="text-sm text-blue-900 leading-relaxed">
                {suggestedAnswer}
              </p>
              <p className="text-[10px] text-blue-400 mt-3 italic">
                * Đây là câu trả lời tham khảo. Không nhất thiết phải trả lời
                y hệt.
              </p>
            </div>
          )}
        </div>
      )}

      {scoreResult?.status === "ERROR" && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-red-600 font-bold mb-1">❌ Chấm điểm thất bại</p>
          <p className="text-sm text-red-500">
            Hệ thống AI không thể chấm điểm bài thu âm này. Có thể do quá thời gian hoặc lỗi kết nối. Vui lòng thử lại.
          </p>
        </div>
      )}

      {audioUrl && state === "stopped" && (
        <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            🔊 Nghe lại bài của bạn:
          </p>
          <audio controls src={audioUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}
