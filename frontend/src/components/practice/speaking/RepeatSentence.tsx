import React from "react";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { MicSection } from "../shared/MicSection";
import { PracticeContentFrame } from "../shared/PracticeContentFrame";
import { repeatSentenceReferenceText } from "../shared/WordComparison";
import { getMaxScore } from "../../../constants/scoring";

export function RepeatSentence({ question }: { question: Question }) {
  type Phase = "idle" | "speaking" | "ready";
  const [phase, setPhase] = React.useState<Phase>("idle");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const goToReady = React.useCallback(() => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setPhase("ready");
  }, []);

  const speak = React.useCallback(() => {
    if (question.audioUrl) {
      setPhase("speaking");
      const el = audioRef.current;
      if (!el) { setPhase("idle"); return; }
      el.currentTime = 0;
      const onEnded = () => {
        el.removeEventListener("ended", onEnded);
        // Chờ 1s rồi tự chuyển sang ready (ngắn hơn trước)
        setTimeout(() => setPhase("ready"), 1000);
      };
      el.addEventListener("ended", onEnded);
      el.play().catch(() => { el.removeEventListener("ended", onEnded); setPhase("idle"); });
      return;
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const text = repeatSentenceReferenceText(question) || question.title || "";
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;

    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => setTimeout(() => setPhase("ready"), 1000);

    setPhase("speaking");
    window.speechSynthesis.speak(utterance);
  }, [question]);

  React.useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // Reset khi đổi câu
  React.useEffect(() => { setPhase("idle"); }, [question.id]);

  const refForMic = repeatSentenceReferenceText(question);
  const canPlay = Boolean(question.audioUrl || refForMic);

  if (!canPlay) {
    return (
      <PracticeContentFrame>
        <div className="practice-body-plain text-center text-sm text-gray-400 py-6">
          Câu hỏi này thiếu dữ liệu (audioUrl hoặc correctAnswer/suggestedAnswer)
        </div>
      </PracticeContentFrame>
    );
  }

  const stepHint =
    phase === "idle"
      ? "Bước 1 · Nghe câu"
      : phase === "speaking"
        ? "Đang phát âm thanh"
        : "Bước 2 · Lặp lại bằng mic";

  return (
    <PracticeContentFrame stepHint={stepHint}>
      {question.audioUrl && (
        <audio ref={audioRef} src={question.audioUrl} preload="auto" className="hidden" />
      )}

      {/* Idle: nút nghe */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-3 sm:gap-4 py-2 sm:py-4">
          <p className="text-xs sm:text-sm text-gray-600 text-center px-2 leading-snug">
            Bấm nghe câu, sau đó lặp lại bằng mic
          </p>
          <Button variant="yellow" size="sm" className="sm:px-5" onClick={speak}>
            ▶ Nghe câu
          </Button>
        </div>
      )}

      {/* Đang phát audio */}
      {phase === "speaking" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex gap-1 items-end h-8">
            {[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-brand-gold motion-safe:animate-bounce"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-amber-900 motion-safe:animate-pulse">
            Đang phát câu...
          </p>
          <button
            onClick={goToReady}
            className="text-xs text-brand-gold font-bold underline motion-safe:active:opacity-70"
          >
            Bỏ qua · Ghi ngay →
          </button>
        </div>
      )}

      {/* Sẵn sàng ghi — MicSection autoStart ngay (prepSeconds=0) */}
      {phase === "ready" && (
        <MicSection
          questionId={question.id}
          prepSeconds={0}
          maxSeconds={question.responseTime || 15}
          label="Lặp lại câu vừa nghe · bấm ⏹ khi xong"
          originalText={refForMic || undefined}
          maxScore={getMaxScore(question.type)}
          wordComparisonStatus={refForMic ? "enabled" : "required_but_missing"}
        />
      )}
    </PracticeContentFrame>
  );
}
