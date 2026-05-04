import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Waveform } from "../../ui";
import { AITutorPanel } from "./AITutorPanel";
import { RecordingWaveform } from "./RecordingWaveform";
import { useRecorder } from "../../../hooks/useRecorder";
import { attemptsApi } from "../../../api";
import { WordComparison } from "./WordComparison";

export interface MicSectionProps {
  questionId: string;
  prepSeconds?: number;
  maxSeconds?: number;
  autoStart?: boolean;
  label?: string;
  originalText?: string;
  maxScore?: number;
  wordComparisonStatus?: "required_but_missing" | "enabled" | "disabled";
  suggestedAnswer?: string;
  /** ASQ: đáp án đã nằm trong feedback — ẩn khối xanh trùng lặp */
  showSuggestedAfterScore?: boolean;
}

export function MicSection({
  questionId,
  prepSeconds = 0,
  maxSeconds = 40,
  autoStart = true,
  label,
  originalText,
  maxScore = 90,
  wordComparisonStatus = "disabled",
  suggestedAnswer,
  showSuggestedAfterScore = true,
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

  const handleReRecord = () => {
    setScoreResult(null);
    setAttemptId(null);
    reset();
  };

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
    micError,
    startRecording,
    startAutoRecording,
    stopRecording,
    reset,
  } = useRecorder({
    prepSeconds,
    maxSeconds,
    onStop: (blob, duration) => submitMutation.mutate({ blob, duration }),
  });

  React.useEffect(() => {
    if (!autoStart) return;
    startAutoRecording(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, startAutoRecording]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="px-0 py-2 sm:py-3 max-md:pb-3">
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
        {(state === "idle" || state === "stopped") && (
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 text-center px-2 leading-snug max-sm:line-clamp-2">
            {state === "stopped"
              ? "Bấm 🎙️ để ghi lại từ đầu"
              : (label || "Chạm nút mic bên dưới để ghi âm")}
          </p>
        )}
      </div>

      <div className="flex justify-center items-end gap-4 sm:gap-6 max-md:mb-2">
        {state === "idle" || state === "countdown" ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={startRecording}
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg transition-all motion-safe:active:scale-95",
                state === "countdown"
                  ? "bg-brand-gold animate-pulse hover:bg-brand-gold-bright shadow-[0_4px_16px_rgba(228,168,8,0.5)]"
                  : "bg-brand-gold hover:bg-brand-gold-bright hover:scale-105 shadow-[0_4px_16px_rgba(228,168,8,0.35)]",
              )}
            >
              🎙️
            </button>
            <span className="text-[10px] font-bold text-amber-900">
              {state === "countdown" ? `Bấm ghi ngay (${countdown}s)` : "Bấm để ghi âm"}
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
        ) : state === "stopped" ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleReRecord}
              className="w-14 h-14 rounded-full bg-brand-gold hover:bg-brand-gold-bright flex items-center justify-center text-2xl text-white shadow-lg transition-all motion-safe:active:scale-95 hover:scale-105 shadow-[0_4px_16px_rgba(228,168,8,0.35)]"
            >
              🎙️
            </button>
            <span className="text-[10px] font-bold text-amber-900">Ghi lại</span>
          </div>
        ) : null}
      </div>

      {micError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-red-500 text-base flex-shrink-0">🎙️❌</span>
          <p className="text-sm text-red-700 leading-snug">{micError}</p>
        </div>
      )}

      {/* Recording waveform — hiển thị ngay khi ghi xong */}
      {audioUrl && state === "stopped" && (
        <div className="mt-3">
          <RecordingWaveform audioUrl={audioUrl} durationSec={elapsed || 1} />
        </div>
      )}

      {submitMutation.isPending && (
        <div className="mt-3 flex items-center justify-center gap-2 py-3 bg-amber-50 rounded-xl border border-amber-100">
          <span className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">AI đang chấm điểm…</p>
        </div>
      )}

      {scoreResult && (
        <div className="mt-4 space-y-3">
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
            <AITutorPanel
              totalScore={scoreResult.totalScore}
              maxScore={maxScore}
              feedback={scoreResult.feedback}
              tutorTip={scoreResult.tutorTip}
              breakdown={scoreResult.scoreBreakdown}
              transcription={scoreResult.transcription}
              wordErrors={scoreResult.wordErrors || []}
              mode="speaking"
            />
          )}
          {scoreResult.status === "SCORED" && showSuggestedAfterScore && suggestedAnswer && (
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

    </div>
  );
}
