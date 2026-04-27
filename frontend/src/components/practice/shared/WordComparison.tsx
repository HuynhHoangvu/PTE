import React from "react";
import { Question } from "../../../types";

export function repeatSentenceReferenceText(q: Question): string | null {
  if (typeof q.correctAnswer === "string" && q.correctAnswer.trim()) {
    return q.correctAnswer.trim();
  }
  if (q.suggestedAnswer?.trim()) {
    return q.suggestedAnswer.trim();
  }
  return null;
}

export function WordComparison({
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
