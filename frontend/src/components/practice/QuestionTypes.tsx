import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Question } from "../../types";
import { AudioPlayer, Button, ScorePanel, Waveform } from "../ui";
import { useRecorder } from "../../hooks/useRecorder";
import { useTimer } from "../../hooks/useTimer";
import { attemptsApi } from "../../api";

/**
 * Bản gốc RS chỉ lấy từ DB field chuyên dụng — không dùng `content`/`title`
 * (dễ lẫn instruction, text crawl lỗi, hoặc dump UI).
 */
function repeatSentenceReferenceText(q: Question): string | null {
  if (typeof q.correctAnswer === "string" && q.correctAnswer.trim()) {
    return q.correctAnswer.trim();
  }
  if (q.suggestedAnswer?.trim()) {
    return q.suggestedAnswer.trim();
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Word-by-word comparison (Read Aloud / Repeat Sentence)
// Uses order-aware sequential matching matching backend scoring logic
// ─────────────────────────────────────────────────────────────────────────────
function WordComparison({
  original,
  transcription,
}: {
  original: string;
  transcription: string;
}) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, "")
      .trim();
  const origWords = normalize(original).split(/\s+/).filter(Boolean);
  const transWords = normalize(transcription).split(/\s+/).filter(Boolean);

  // Presence-based matching for display: a word is "green" if it appears
  // anywhere in the transcription (regardless of order).
  // This matches how users naturally perceive their own speech —
  // sequential matching is too strict for display and causes false red highlights.
  const transWordSet = new Set(transWords);

  const results = origWords.map((w) => ({
    word: w,
    correct: transWordSet.has(w),
  }));

  const correctCount = results.filter((r) => r.correct).length;
  const pct =
    origWords.length > 0
      ? Math.round((correctCount / origWords.length) * 100)
      : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
        ✓✗ So sánh với bài gốc
      </p>

      {/* Original text with word status */}
      <p className="text-sm leading-loose">
        {results.map((r, i) => (
          <span
            key={i}
            className={`mr-1 inline-block px-1.5 py-0.5 rounded font-medium transition-all border ${
              r.correct
                ? "text-green-700 bg-green-50 border-green-300"
                : "text-red-600 bg-red-50 border-red-200 line-through decoration-red-400"
            }`}
            title={r.correct ? "✓ Phát âm đúng" : "✗ Không phát âm từ này"}
          >
            {r.word}
          </span>
        ))}
      </p>

      {/* Score bar */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 80
                ? "bg-green-500"
                : pct >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-right">
          <div
            className={`text-sm font-bold ${
              pct >= 80
                ? "text-green-600"
                : pct >= 60
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            {correctCount}/{origWords.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: MicRecorder section (used in all speaking tasks)
// ─────────────────────────────────────────────────────────────────────────────
interface MicSectionProps {
  questionId: string;
  prepSeconds?: number;
  maxSeconds?: number;
  label?: string;
  originalText?: string;
  maxScore?: number;
  wordComparisonStatus?: "required_but_missing" | "enabled" | "disabled";
  suggestedAnswer?: string;
}

function MicSection({
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
        // Update transcription as soon as it's available (even before scoring finishes)
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
    <div className="px-5 py-5">
      {/* Countdown message */}
      {state === "idle" && prepSeconds > 0 && (
        <p className="text-sm text-gray-500 text-center mb-4">
          Click to record or recording will begin in{" "}
          <span className="text-brand-orange font-bold">
            {formatTime(prepSeconds)}
          </span>{" "}
          second(s)
        </p>
      )}
      {state === "countdown" && (
        <p className="text-sm text-center text-gray-500 mb-4">
          Beginning in{" "}
          <span className="text-brand-orange font-bold">
            {formatTime(countdown)}
          </span>{" "}
          second(s)
        </p>
      )}

      {/* Waveform */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 py-4 mb-4 flex flex-col items-center">
        <Waveform active={state === "recording"} />
        {state === "recording" && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-gray-500">
              {formatTime(elapsed)} / {formatTime(maxSeconds)}
            </span>
          </div>
        )}
        {state === "idle" || state === "stopped" ? (
          <p className="text-xs text-gray-400 mt-1">
            {label || "Click to record"}
          </p>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex justify-center items-end gap-6">
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
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all",
                state === "countdown"
                  ? "bg-gray-200 cursor-wait"
                  : "bg-brand-yellow hover:bg-brand-yellow-deep hover:scale-105 shadow-[0_4px_16px_rgba(245,197,24,0.4)]",
              )}
            >
              🎙️
            </button>
            <span className="text-[10px] font-bold text-brand-orange">
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

      {/* Score result */}
      {submitMutation.isPending && (
        <div className="mt-4 text-center text-sm text-gray-400 animate-pulse">
          🤖 AI đang chấm điểm...
        </div>
      )}
      {scoreResult && (
        <div className="mt-4 space-y-3">
          {/* Transcription */}
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
          {/* Word comparison vs original */}
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
          {/* Score panel */}
          {scoreResult.status === "SCORED" && (
            <ScorePanel
              totalScore={scoreResult.totalScore}
              breakdown={scoreResult.scoreBreakdown}
              feedback={scoreResult.feedback}
              maxScore={maxScore}
            />
          )}
          {/* Suggested Answer */}
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

      {/* Playback */}
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Read Aloud
// ─────────────────────────────────────────────────────────────────────────────
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
      <div className="px-5 py-5">
        <p
          className={clsx(
            "text-base leading-relaxed text-gray-800 bg-gray-50 rounded-xl p-4 border border-gray-200 select-none",
            !started && "blur-sm",
          )}
        >
          {question.content}
        </p>
      </div>
      {!started ? (
        <div className="px-5 pb-5 flex justify-center">
          <Button variant="yellow" onClick={() => setStarted(true)}>
            ▶ Start to practice
          </Button>
        </div>
      ) : (
        <MicSection
          questionId={question.id}
          prepSeconds={question.prepTime || 40}
          maxSeconds={question.responseTime || 40}
          label="Click to record or recording will begin automatically"
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. Repeat Sentence — TTS đọc câu, sau đó mic tự bật
// ─────────────────────────────────────────────────────────────────────────────
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
    if (!text.trim()) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Chọn giọng tiếng Anh nếu có
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;

    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => {
      afterAudioEnds();
    };

    setPhase("speaking");
    window.speechSynthesis.speak(utterance);
  }, [question, afterAudioEnds]);

  // Cleanup khi unmount
  React.useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const refForMic = repeatSentenceReferenceText(question);
  const canPlay = Boolean(question.audioUrl || refForMic);

  // If no audio URL and no reference text, don't show this question
  if (!canPlay) {
    return (
      <div className="px-5 py-5 text-center text-sm text-gray-400">
        Câu hỏi này thiếu dữ liệu (audioUrl hoặc correctAnswer/suggestedAnswer)
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-5">
      {question.audioUrl ? (
        <audio
          ref={audioRef}
          src={question.audioUrl}
          preload="auto"
          className="hidden"
        />
      ) : null}
      {/* Phase: idle — hiện nút Start */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-gray-500 text-center">
            Bấm để nghe câu, sau đó lặp lại
          </p>
          <Button variant="yellow" onClick={speak}>
            ▶ Play Sentence
          </Button>
        </div>
      )}

      {/* Phase: speaking — đang đọc */}
      {phase === "speaking" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex gap-1 items-end h-8">
            {[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-brand-orange animate-bounce"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-brand-orange animate-pulse">
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

      {/* Phase: countdown sau khi đọc xong */}
      {phase === "speaking" && countdown > 0 && (
        <p className="text-center text-sm text-gray-500">
          Bắt đầu thu âm trong{" "}
          <span className="font-bold text-brand-orange">{countdown}s</span>
        </p>
      )}

      {/* Phase: ready — hiện mic */}
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

// ─────────────────────────────────────────────────────────────────────────────
// AudioWithMic — Answer Short Question / Respond to Situation / SGD / Retell
// ─────────────────────────────────────────────────────────────────────────────
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
    <div className="px-5 py-5 space-y-4">
      {/* Situation text — RTS */}
      {isRTS && question.content && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
            📋 Situation
          </p>
          <p className="text-sm text-amber-900 leading-relaxed">
            {question.content}
          </p>
        </div>
      )}
      {/* Discussion transcript — SGD (hiển thị khi không có audio) */}
      {isSGD && !question.audioUrl && question.content && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-3">
            🗣️ Group Discussion Transcript
          </p>
          <div className="space-y-1.5">
            {question.content.split("\n").map((line, i) => {
              const match = line.match(/^\[(.+?)\]\s*(.*)/);
              if (match) {
                return (
                  <p key={i} className="text-sm text-purple-900 leading-relaxed">
                    <span className="font-bold text-purple-700">[{match[1]}]</span>{" "}
                    {match[2]}
                  </p>
                );
              }
              return line.trim() ? (
                <p key={i} className="text-sm text-purple-900 leading-relaxed">{line}</p>
              ) : null;
            })}
          </div>
        </div>
      )}
      {/* Audio player — chỉ render khi có audioUrl */}
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
        label="Click to record, or recording will start automatically after the audio ends."
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Describe Image
// ─────────────────────────────────────────────────────────────────────────────
export function DescribeImage({ question }: { question: Question }) {
  if (!question.imageUrl) {
    return (
      <div className="p-12 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-5xl mb-4">🖼️❓</p>
          <h3 className="text-lg font-bold text-amber-900">Missing Image</h3>
          <p className="text-sm text-amber-700 mt-2 leading-relaxed">
            This Describe Image question does not have an image associated with
            it. Please try another question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-0">
        {/* Image side */}
        <div className="px-5 py-5 border-r border-gray-100">
          <img
            src={question.imageUrl}
            alt="Describe this"
            className="w-full rounded-xl border border-gray-200 object-contain max-h-80 shadow-sm"
          />
        </div>
        {/* Mic side */}
        <div>
          <MicSection
            questionId={question.id}
            prepSeconds={question.prepTime || 25}
            maxSeconds={question.responseTime || 40}
            label="Click to record or recording will begin in countdown"
            wordComparisonStatus="disabled"
            maxScore={15}
          />
        </div>
      </div>

      {/* Sample Answer that was generated by Gemini */}
      {question.suggestedAnswer && (
        <div className="px-5 pb-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 mt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">
              💡 Sample Answer Transcript
            </h4>
            <p className="text-sm text-blue-900 leading-relaxed">
              {question.suggestedAnswer}
            </p>
            <p className="text-[10px] text-blue-400 mt-3 italic">
              * This sample answer is generated by AI (Gemini) as a reference.
              You don't need to memorize it word-for-word.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Summarize Written Text
// ─────────────────────────────────────────────────────────────────────────────
export function SummarizeWrittenText({ question }: { question: Question }) {
  const [answer, setAnswer] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(600); // 10 min
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  React.useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, textAnswer: answer }),
    onSuccess: async (data) => {
      setSubmitted(true);
      let tries = 0;
      const poll = async () => {
        const r = await attemptsApi.pollScore(data.id);
        if (r.status === "SCORED") {
          setResult(r);
          return;
        }
        if (++tries < 20) setTimeout(poll, 2000);
      };
      poll();
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-52 overflow-y-auto">
        <p className="text-sm leading-relaxed text-gray-800">
          {question.content}
        </p>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Your answer</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 resize-none h-28 focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 disabled:bg-gray-50"
          placeholder="Type your one-sentence summary here..."
        />
        <div className="flex justify-between items-center mt-1.5">
          <span
            className={clsx(
              "text-xs font-semibold",
              wordCount > 75
                ? "text-red-500"
                : wordCount >= 5
                  ? "text-green-600"
                  : "text-gray-400",
            )}
          >
            {wordCount}/75 words {wordCount > 75 ? "⚠️ Too long" : ""}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Time remaining{" "}
              <span
                className={clsx(
                  "font-bold",
                  timeLeft < 60 ? "text-red-500" : "text-brand-orange",
                )}
              >
                {fmt(timeLeft)}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={!answer.trim() || submitted || submitMutation.isPending}
            >
              {submitMutation.isPending ? "⏳" : "🤖 Click to score"}
            </Button>
          </div>
        </div>
      </div>

      {submitted && question.suggestedAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1.5 flex items-center gap-1.5">
            💡 Sample Answer
          </p>
          <div className="text-sm text-green-900 leading-relaxed whitespace-pre-wrap">
            {question.suggestedAnswer}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={result.totalScore}
          breakdown={result.scoreBreakdown}
          feedback={result.feedback}
          maxScore={9}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Write Essay
// ─────────────────────────────────────────────────────────────────────────────
export function WriteEssay({ question }: { question: Question }) {
  const [answer, setAnswer] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(1200); // 20 min
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const paragraphCount = answer.split(/\n\n+/).filter((p) => p.trim()).length;
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  React.useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, textAnswer: answer }),
    onSuccess: async (data) => {
      setSubmitted(true);
      let tries = 0;
      const poll = async () => {
        const r = await attemptsApi.pollScore(data.id);
        if (r.status === "SCORED") {
          setResult(r);
          return;
        }
        if (++tries < 20) setTimeout(poll, 2000);
      };
      poll();
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="px-5 py-5 space-y-4">
      {question.content && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <p className="text-sm text-gray-800 leading-relaxed">
            {question.content}
          </p>
        </div>
      )}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Your answer</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          rows={10}
          className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 resize-none focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 disabled:bg-gray-50"
          placeholder="Write your essay here..."
        />
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs text-gray-400">
            {wordCount}/300 words · {paragraphCount} paragraph
            {paragraphCount !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Time remaining{" "}
              <span
                className={clsx(
                  "font-bold",
                  timeLeft < 120 ? "text-red-500" : "text-brand-orange",
                )}
              >
                {fmt(timeLeft)}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={wordCount < 50 || submitted || submitMutation.isPending}
            >
              {submitMutation.isPending ? "⏳" : "🤖 Click to score"}
            </Button>
          </div>
        </div>
      </div>

      {submitted && question.suggestedAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1.5 flex items-center gap-1.5">
            💡 Sample Answer
          </p>
          <div className="text-sm text-green-900 leading-relaxed whitespace-pre-wrap">
            {question.suggestedAnswer}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={result.totalScore}
          breakdown={result.scoreBreakdown}
          feedback={result.feedback}
          maxScore={26}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MC Choose Single / Multiple
// ─────────────────────────────────────────────────────────────────────────────
export function MCQuestion({
  question,
  multiple = false,
}: {
  question: Question;
  multiple?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const options: { label: string; text: string }[] = question.options || [];

  const toggle = (label: string) => {
    if (submitted) return;
    if (multiple) {
      setSelected((p) =>
        p.includes(label) ? p.filter((x) => x !== label) : [...p, label],
      );
    } else {
      setSelected([label]);
    }
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: multiple ? selected : selected[0],
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  // correctAnswer có thể là: string[] | string | { transcript: "..." } (lỗi backfill)
  // Chỉ dùng khi là mảng các string label như ["A","C"]
  const correctAnswers: string[] = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.filter((x: any) => typeof x === "string")
    : typeof question.correctAnswer === "string"
      ? [question.correctAnswer]
      : [];

  return (
    <div className="px-5 py-5 space-y-4">
      {question.content && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-60 overflow-y-auto">
          <p className="text-sm leading-relaxed text-gray-800">
            {question.content}
          </p>
        </div>
      )}
      {question.title &&
        !["need help", "need help?", "help"].includes(
          question.title.toLowerCase(),
        ) && (
          <p className="text-sm font-bold text-gray-800">{question.title}</p>
        )}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          const isCorrect = submitted && correctAnswers.includes(opt.label);
          const isWrong =
            submitted && isSelected && !correctAnswers.includes(opt.label);
          return (
            <label
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={clsx(
                "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                isCorrect
                  ? "border-green-400 bg-green-50"
                  : isWrong
                    ? "border-red-400 bg-red-50"
                    : isSelected
                      ? "border-brand-yellow bg-brand-yellow-soft"
                      : "border-gray-200 bg-white hover:border-brand-yellow hover:bg-brand-yellow-soft/50",
              )}
            >
              {multiple ? (
                <div
                  className={clsx(
                    "w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
                    isSelected
                      ? "bg-brand-yellow border-brand-yellow"
                      : "border-gray-300",
                  )}
                >
                  {isSelected && (
                    <span className="text-[8px] font-black">✓</span>
                  )}
                </div>
              ) : (
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
                    isSelected ? "border-brand-yellow" : "border-gray-300",
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-brand-yellow" />
                  )}
                </div>
              )}
              <div className="flex gap-2 flex-1">
                <span className="text-xs font-black text-gray-400 mt-0.5">
                  {opt.label}
                </span>
                <span className="text-sm text-gray-800">{opt.text}</span>
              </div>
              {isCorrect && <span className="text-green-500 text-sm">✓</span>}
              {isWrong && <span className="text-red-500 text-sm">✗</span>}
              {submitted &&
                !isSelected &&
                correctAnswers.includes(opt.label) && (
                  <span className="text-green-600 text-[10px] font-bold bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider">
                    Đáp án đúng
                  </span>
                )}
            </label>
          );
        })}
      </div>
      {!submitted && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={selected.length === 0 || submitMutation.isPending}
          >
            🤖 Click to score
          </Button>
        </div>
      )}
      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Re-order Paragraphs (drag & drop)
// ─────────────────────────────────────────────────────────────────────────────
export function ReorderParagraphs({ question }: { question: Question }) {
  const options: { label: string; text: string }[] = question.options || [];
  const [source, setSource] = React.useState(options);
  const [target, setTarget] = React.useState<typeof options>([]);
  const [dragItem, setDragItem] = React.useState<{
    label: string;
    from: "source" | "target";
  } | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: target.map((t) => t.label),
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  const moveToTarget = (item: (typeof options)[0]) => {
    setSource((p) => p.filter((x) => x.label !== item.label));
    setTarget((p) => [...p, item]);
  };

  const moveToSource = (item: (typeof options)[0]) => {
    setTarget((p) => p.filter((x) => x.label !== item.label));
    setSource((p) => [...p, item]);
  };

  return (
    <div className="px-5 py-5">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Source */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            Source
          </p>
          <div className="space-y-2 min-h-32 border-2 border-dashed border-gray-200 rounded-xl p-2">
            {source.map((item) => (
              <div
                key={item.label}
                onClick={() => moveToTarget(item)}
                className="flex gap-2 bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-brand-yellow hover:bg-brand-yellow-soft transition-all text-sm"
              >
                <span className="text-xs font-black text-gray-400 mt-0.5 flex-shrink-0">
                  {item.label}
                </span>
                <span className="text-gray-800 text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            Your answer
          </p>
          <div className="space-y-2 min-h-32 border-2 border-dashed border-brand-yellow/40 rounded-xl p-2 bg-brand-yellow-soft/30">
            {target.length === 0 && (
              <div className="flex items-center justify-center h-28 text-gray-400 text-sm">
                <span>+ Drag here</span>
              </div>
            )}
            {target.map((item, idx) => (
              <div
                key={item.label}
                onClick={() => moveToSource(item)}
                className="flex gap-2 bg-white border border-brand-yellow rounded-lg p-3 cursor-pointer hover:bg-brand-yellow-light transition-all text-sm"
              >
                <span className="text-xs font-black text-brand-orange mt-0.5 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-gray-800 text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submitMutation.mutate()}
          disabled={target.length === 0 || submitted}
        >
          🤖 Click to score
        </Button>
      </div>

      {submitted && question.correctAnswer && (
        <div className="mt-3 bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs font-black uppercase tracking-widest text-green-500 mb-2">
            ✅ Thứ tự đúng (Correct Order)
          </p>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(question.correctAnswer)
              ? question.correctAnswer
              : []
            ).map((label: string, i: number) => (
              <span
                key={label}
                className="text-sm font-bold bg-white text-green-700 px-2 py-1 rounded border border-green-200"
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <div className="mt-3 bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.5 Fill in Blanks - Reading & Writing (dropdown)
// ─────────────────────────────────────────────────────────────────────────────
export function FillInBlanksRW({ question }: { question: Question }) {
  // Detect format:
  //   A) Crawled: options = [{text, isBlank, options?[]}, ...] — segments stored in options field
  //   B) Seed:    content = "text __1__ text __2__", options = ["opt1","opt2",...] flat array
  type RawSeg = { text: string; isBlank: boolean; options?: string[] };
  const rawOpts = (question.options as any[]) || [];
  const isSegmentsFormat =
    rawOpts.length > 0 &&
    typeof rawOpts[0] === "object" &&
    rawOpts[0] !== null &&
    "isBlank" in rawOpts[0];

  type Segment =
    | { text: string; isBlank: false }
    | { blankIdx: number; isBlank: true; choices: string[] };

  let segments: Segment[] = [];
  let blankCount = 0;

  if (isSegmentsFormat) {
    // Format A — crawled data
    const allChoices: string[] = [];
    rawOpts.forEach((s: RawSeg) => {
      if (s.isBlank && Array.isArray(s.options)) allChoices.push(...s.options);
    });
    rawOpts.forEach((s: RawSeg) => {
      if (!s.isBlank) {
        segments.push({ isBlank: false, text: s.text });
      } else {
        // Per-blank options if available, otherwise fall back to all choices
        const choices = Array.isArray(s.options) && s.options.length > 0 ? s.options : allChoices;
        segments.push({ isBlank: true, blankIdx: blankCount++, choices });
      }
    });
  } else {
    // Format B — seed data with __N__ markers in content
    const rawContent: string = (question.content as any) || "";
    const flatChoices: string[] = rawOpts.filter((o) => typeof o === "string");
    const parts = rawContent.split(/(__\d+__)/);
    parts.forEach((part) => {
      if (/^__\d+__$/.test(part)) {
        segments.push({ isBlank: true, blankIdx: blankCount++, choices: flatChoices });
      } else if (part) {
        segments.push({ isBlank: false, text: part });
      }
    });
  }


  const rawAnswers = question.correctAnswer || [];
  const correctAnswers: string[] = Array.isArray(rawAnswers)
    ? rawAnswers
    : Object.values(rawAnswers);

  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => {
      const selectedAnswers = Array.from({ length: blankCount }).map(
        (_, i) => answers[i] || "",
      );
      return attemptsApi.submitText({ questionId: question.id, selectedAnswers });
    },
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="text-sm leading-[2.8] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-inner">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;

          const currentIdx = seg.blankIdx;
          const val = answers[currentIdx] || "";

          let selectClass =
            "mx-1 px-2 py-0.5 border-2 rounded text-sm font-semibold outline-none transition-colors cursor-pointer text-brand-black ";

          if (!submitted) {
            selectClass += val
              ? "border-brand-yellow bg-brand-yellow-soft"
              : "border-gray-300 bg-white hover:border-gray-400 focus:border-brand-yellow";
          } else {
            const isCorrect = correctAnswers[currentIdx]?.toLowerCase() === val?.toLowerCase();
            selectClass += isCorrect
              ? "border-green-400 bg-green-50 text-green-700"
              : "border-red-400 bg-red-50 text-red-700";
          }

          return (
            <select
              key={i}
              value={val}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, [currentIdx]: e.target.value }))
              }
              disabled={submitted}
              className={selectClass}
            >
              <option value="" disabled></option>
              {seg.choices.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
          🤖 Click to score
        </Button>
      </div>

      {submitted && correctAnswers.length > 0 && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">
            ✅ Đáp án đúng (Correct Answers)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {correctAnswers.map((ans, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-gray-500 text-xs mr-1">
                  Blank {idx + 1}:
                </span>
                <span className="font-bold text-green-700">{ans}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={result.totalScore}
          breakdown={result.scoreBreakdown}
          feedback={result.feedback}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fill in Blanks - Reading (drag words)
// ─────────────────────────────────────────────────────────────────────────────
export function FillInBlanksReading({ question }: { question: Question }) {
  // DB format:
  //   content: "text __1__ text __2__ text"
  //   options: [{blank:"1", choices:[...]}, {blank:"2", choices:[...]}]
  //   correctAnswer: {"1":"word1", "2":"word2"}
  const rawContent: string = (question.content as any) || "";
  const rawOpts = (question.options as any[]) || [];

  type Seg = { text: string; isBlank: false } | { blankId: string; isBlank: true };
  const segments: Seg[] = [];
  const allChoices: string[] = [];
  let blankCount = 0;

  // Detect Format C: content is a JSON string of [{text, isBlank}, ...] (crawled RFIB data)
  let parsedJson: any[] | null = null;
  try { parsedJson = JSON.parse(rawContent); } catch {}

  if (Array.isArray(parsedJson) && parsedJson.length > 0 && parsedJson[0]?.hasOwnProperty?.("isBlank")) {
    // Format C: JSON segments in content, pool words in options (flat string array)
    parsedJson.forEach((s: any) => {
      if (s.isBlank) segments.push({ isBlank: true, blankId: String(++blankCount) });
      else if (s.text) segments.push({ isBlank: false, text: s.text });
    });
    rawOpts.forEach((o: any) => {
      if (typeof o === "string" && !allChoices.includes(o)) allChoices.push(o);
    });
  } else {
    // Format B: __N__ markers in content, options = [{blank, choices}]
    rawContent.split(/(__\d+__)/).forEach((part) => {
      const m = part.match(/^__(\d+)__$/);
      if (m) segments.push({ isBlank: true, blankId: m[1] });
      else if (part) segments.push({ isBlank: false, text: part });
    });
    rawOpts.forEach((o: any) => {
      if (o?.blank && Array.isArray(o.choices)) {
        o.choices.forEach((c: string) => { if (!allChoices.includes(c)) allChoices.push(c); });
      }
    });
  }

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [available, setAvailable] = React.useState<string[]>(allChoices);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const fillBlank = (blankId: string, word: string) => {
    const prev = answers[blankId];
    if (prev) setAvailable((p) => [...p, prev]);
    setAnswers((p) => ({ ...p, [blankId]: word }));
    setAvailable((p) => p.filter((w) => w !== word));
  };

  const clearBlank = (blankId: string) => {
    const word = answers[blankId];
    if (word) {
      setAvailable((p) => [...p, word]);
      setAnswers((p) => { const n = { ...p }; delete n[blankId]; return n; });
    }
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: answers, // {"1":"word1","2":"word2"}
      }),
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="text-sm leading-[2.2] text-gray-800">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;
          const id = seg.blankId;
          const val = answers[id];
          return (
            <span
              key={i}
              onClick={() => val && clearBlank(id)}
              className={clsx(
                "inline-flex items-center min-w-[110px] mx-1 px-2 py-0.5 border-b-2 rounded cursor-pointer text-sm font-medium transition-colors",
                val
                  ? "border-brand-yellow bg-brand-yellow-light text-brand-black"
                  : "border-gray-400 bg-gray-50 text-gray-400",
              )}
            >
              {val || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {val && <span className="ml-1 text-gray-400 text-xs">✕</span>}
            </span>
          );
        })}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
        {available.map((w) => (
          <button
            key={w}
            onClick={() => {
              const firstEmpty = segments.find(
                (s) => s.isBlank && !answers[s.blankId],
              );
              if (firstEmpty && firstEmpty.isBlank) fillBlank(firstEmpty.blankId, w);
            }}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:border-brand-yellow hover:bg-brand-yellow-soft transition-colors"
          >
            {w}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submitMutation.mutate()}
          disabled={submitted}
        >
          🤖 Click to score
        </Button>
      </div>

      {submitted && question.correctAnswer && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">
            ✅ Đáp án đúng (Correct Answers)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(
              question.correctAnswer as Record<string, string>,
            ).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="text-gray-500 text-xs mr-1">Blank {k}:</span>
                <span className="font-bold text-green-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Listening: Fill in Blanks (type)
// ─────────────────────────────────────────────────────────────────────────────
export function ListeningFIB({ question }: { question: Question }) {
  // Crawl script saves segments as JSON string in content field
  let rawSegments: { text: string; isBlank: boolean }[] = [];
  try {
    const parsed = JSON.parse((question.content as any) || "[]");
    if (Array.isArray(parsed)) rawSegments = parsed;
  } catch {}
  const segments = rawSegments;

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

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

  let blankIdx = 0;
  return (
    <div className="px-5 py-5 space-y-4">
      <AudioPlayer
        src={question.audioUrl}
        countdownSeconds={7}
        showSpeedControl
      />
      <div className="text-sm leading-[2.5] text-gray-800">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;
          const id = `blank_${blankIdx++}`;
          return (
            <input
              key={i}
              value={answers[id] || ""}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, [id]: e.target.value }))
              }
              disabled={submitted}
              className="inline-block mx-1 px-2 py-0.5 border-b-2 border-gray-400 focus:border-brand-yellow outline-none bg-transparent text-sm min-w-[100px] text-brand-black font-medium"
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
          🤖 Click to score
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
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Highlight Incorrect Words (click to highlight)
// ─────────────────────────────────────────────────────────────────────────────
export function HighlightIncorrectWords({ question }: { question: Question }) {
  const words = (question.content || "").split(/(\s+)/);
  const [highlighted, setHighlighted] = React.useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();

  const toggle = (idx: number, word: string) => {
    if (submitted || !word.trim()) return;
    setHighlighted((p) => {
      const n = new Set(p);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const selectedWords = [...highlighted]
        .map((idx) => words[idx].trim())
        .filter(Boolean);
      return attemptsApi.submitText({
        questionId: question.id,
        selectedAnswers: selectedWords,
      });
    },
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") setResult(data);
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  // Chua biet answer luu chu hoa hay thuong, tat ca normalize ve chu thuong
  const correctAnswers = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.map((w: string) =>
        w.toLowerCase().replace(/[^a-z0-9]/g, ""),
      )
    : [];

  return (
    <div className="px-5 py-5 space-y-4">
      <AudioPlayer
        src={question.audioUrl}
        countdownSeconds={5}
        showSpeedControl
      />
      <div className="text-sm leading-[2] text-gray-800 bg-gray-50 rounded-xl p-4 border border-gray-200 select-none">
        {words.map((word, idx) => {
          if (!word.trim()) return <span key={idx}>{word}</span>;
          const isH = highlighted.has(idx);

          let extraClass = isH
            ? "bg-brand-yellow text-brand-black"
            : "hover:bg-gray-200";
          if (submitted) {
            const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, "");
            const isActualWrongWord = correctAnswers.includes(normalized);

            if (isH && isActualWrongWord)
              extraClass =
                "bg-green-200 text-green-900 border-b-2 border-green-500 font-bold";
            if (isH && !isActualWrongWord)
              extraClass = "bg-red-200 text-red-900 font-bold line-through";
            if (!isH && isActualWrongWord)
              extraClass =
                "bg-green-50 text-green-700 border-b-2 border-green-500 border-dashed font-bold";
            if (!isH && !isActualWrongWord) extraClass = "";
          }

          return (
            <span
              key={idx}
              onClick={() => toggle(idx, word)}
              className={clsx(
                "cursor-pointer rounded px-0.5 transition-colors",
                extraClass,
              )}
            >
              {word}
            </span>
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
          🤖 Click to score
        </Button>
      </div>
      {result?.status === "SCORED" && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-bold text-brand-orange">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Write from Dictation / Summarize Spoken Text (audio + textarea)
// ─────────────────────────────────────────────────────────────────────────────
export function AudioTextAnswer({
  question,
  minWords,
  maxWords,
  maxScore = 90,
}: {
  question: Question;
  minWords?: number;
  maxWords?: number;
  maxScore?: number;
}) {
  const [answer, setAnswer] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(600);
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const qc = useQueryClient();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  React.useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submitText({ questionId: question.id, textAnswer: answer }),
    onSuccess: async (data) => {
      setSubmitted(true);
      if (data.status === "SCORED") {
        // Instant score (Dictation)
        setResult(data);
      } else {
        // AI score (SST) — poll until scored
        let tries = 0;
        const poll = async () => {
          const r = await attemptsApi.pollScore(data.id);
          if (r.status === "SCORED") { setResult(r); return; }
          if (++tries < 20) setTimeout(poll, 2000);
        };
        poll();
      }
      qc.invalidateQueries({ queryKey: ["attempts", question.id] });
    },
  });

  return (
    <div className="px-5 py-5 space-y-4">
      <AudioPlayer
        src={question.audioUrl}
        countdownSeconds={7}
        showSpeedControl
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={submitted}
        rows={5}
        className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 resize-none focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 disabled:bg-gray-50"
        placeholder={
          maxWords
            ? `Write your answer here (${minWords || 0}–${maxWords} words)...`
            : "Type what you hear..."
        }
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {wordCount}
          {maxWords ? `/${maxWords} words` : " words"}
        </span>
        <div className="flex items-center gap-3">
          {timeLeft < 6000 && (
            <span className="text-xs text-gray-500">
              Time remaining{" "}
              <span
                className={clsx(
                  "font-bold",
                  timeLeft < 60 ? "text-red-500" : "text-brand-orange",
                )}
              >
                {fmt(timeLeft)}
              </span>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={!answer.trim() || submitted || submitMutation.isPending}
          >
            {submitMutation.isPending ? "⏳" : "🤖 Click to score"}
          </Button>
        </div>
      </div>

      {submitted && (
        <div className="mt-4 space-y-3">
          {question.correctAnswer?.transcript && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1.5 flex items-center gap-1.5">
                📝 Audio Transcript
              </p>
              <p className="text-sm text-blue-900 italic leading-relaxed">
                {question.correctAnswer.transcript}
              </p>
            </div>
          )}
          {question.suggestedAnswer && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1.5 flex items-center gap-1.5">
                💡 Suggested Answer
              </p>
              <div className="text-sm text-green-900 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {question.suggestedAnswer}
              </div>
            </div>
          )}
        </div>
      )}

      {result?.status === "SCORED" && (
        <ScorePanel
          totalScore={result.totalScore}
          breakdown={result.scoreBreakdown}
          feedback={result.feedback}
          maxScore={maxScore}
        />
      )}
    </div>
  );
}
