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

const normWord = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9']/g, "")
    .trim();

/**
 * So khớp theo thứ tự: mỗi từ trong đáp án tìm lần lượt trong bản ghi (không dùng Set — tránh đếm trùng / sai thứ tự).
 */
export function alignReferenceWordsOrdered(original: string, transcription: string) {
  const origWords = original
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map(normWord)
    .filter(Boolean);
  const transWords = transcription
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map(normWord)
    .filter(Boolean);

  // LCS-style alignment in pure TS: reduces cascade penalty after local mismatch.
  const n = origWords.length;
  const m = transWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        origWords[i] === transWords[j]
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const correctRef = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (origWords[i] === transWords[j]) {
      correctRef.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const results = origWords.map((ow, idx) => ({
    word: ow,
    correct: correctRef.has(idx),
  }));

  const correctCount = results.filter((r) => r.correct).length;
  const pct =
    origWords.length > 0 ? Math.round((correctCount / origWords.length) * 100) : 0;

  return { results, correctCount, totalRef: origWords.length, pct };
}

export function WordComparison({
  original,
  transcription,
}: {
  original: string;
  transcription: string;
}) {
  const { results, correctCount, totalRef, pct } = alignReferenceWordsOrdered(
    original,
    transcription,
  );

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl px-4 py-3"
      role="region"
      aria-label="So sánh từng từ bạn nói với bài gốc"
    >
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
            title={
              r.correct
                ? "✓ Khớp thứ tự trong bản ghi"
                : "✗ Chưa nghe thấy đúng từ này (theo thứ tự)"
            }
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
            {correctCount}/{totalRef}
          </div>
        </div>
      </div>
    </div>
  );
}
