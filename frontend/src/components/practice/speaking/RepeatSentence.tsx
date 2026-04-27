import React from "react";
import { Question } from "../../../types";
import { Button } from "../../ui";
import { MicSection } from "../shared/MicSection";
import { repeatSentenceReferenceText } from "../shared/WordComparison";

export function RepeatSentence({ question }: { question: Question }) {
  type Phase = "idle" | "speaking" | "ready";
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [countdown, setCountdown] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const afterAudioEnds = React.useCallback(() => {
    setCountdown(2);
    let c = 2;
    const t = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(t);
        setPhase("ready");
      }
    }, 1000);
  }, []);

  const speak = React.useCallback(() => {
    if (question.audioUrl) {
      setPhase("speaking");
      const el = audioRef.current;
      if (!el) {
        setPhase("idle");
        return;
      }
      el.currentTime = 0;
      const onEnded = () => {
        el.removeEventListener("ended", onEnded);
        afterAudioEnds();
      };
      el.addEventListener("ended", onEnded);
      el.play().catch(() => {
        el.removeEventListener("ended", onEnded);
        setPhase("idle");
      });
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
    utterance.onend = () => { afterAudioEnds(); };

    setPhase("speaking");
    window.speechSynthesis.speak(utterance);
  }, [question, afterAudioEnds]);

  React.useEffect(
    () => () => { window.speechSynthesis?.cancel(); },
    [],
  );

  const refForMic = repeatSentenceReferenceText(question);
  const canPlay = Boolean(question.audioUrl || refForMic);

  if (!canPlay) {
    return (
      <div className="practice-body-plain text-center text-sm text-gray-400 py-6">
        Câu hỏi này thiếu dữ liệu (audioUrl hoặc correctAnswer/suggestedAnswer)
      </div>
    );
  }

  return (
    <div className="practice-body space-y-4 sm:space-y-5">
      {question.audioUrl ? (
        <audio
          ref={audioRef}
          src={question.audioUrl}
          preload="auto"
          className="hidden"
        />
      ) : null}

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-600 text-center px-2 leading-snug">
            Bấm nghe câu, sau đó lặp lại bằng mic
          </p>
          <Button variant="yellow" size="sm" className="sm:px-5" onClick={speak}>
            ▶ Nghe câu
          </Button>
        </div>
      )}

      {phase === "speaking" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex gap-1 items-end h-8">
            {[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-brand-gold animate-bounce"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-amber-900 animate-pulse">
            AI đang đọc câu...
          </p>
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              audioRef.current?.pause();
              setPhase("ready");
            }}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Bỏ qua
          </button>
        </div>
      )}

      {phase === "speaking" && countdown > 0 && (
        <p className="text-center text-sm text-gray-500">
          Bắt đầu thu âm trong{" "}
          <span className="font-bold text-brand-gold">{countdown}s</span>
        </p>
      )}

      {phase === "ready" && (
        <MicSection
          questionId={question.id}
          prepSeconds={0}
          maxSeconds={question.responseTime || 15}
          label="Lặp lại câu vừa nghe"
          originalText={refForMic || undefined}
          maxScore={13}
          wordComparisonStatus={refForMic ? "enabled" : "required_but_missing"}
        />
      )}
    </div>
  );
}
