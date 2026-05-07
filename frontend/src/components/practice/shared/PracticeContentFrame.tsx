import React from "react";
import { clsx } from "clsx";

/** Dòng gợi ý quy trình (Đọc → Trả lời) — luôn ở đầu vùng làm bài */
export function PracticeStepHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-black uppercase tracking-widest text-gray-400 text-center leading-tight px-2 pt-1 pb-2"
      role="status"
    >
      {children}
    </p>
  );
}

/**
 * Khung nội dung làm bài thống nhất: max-width, padding ngang, nhịp dọc.
 * Dùng trên mobile (MQuestionPage) và desktop (PracticeLayout).
 */
export function PracticeContentFrame({
  stepHint,
  children,
  className,
}: {
  stepHint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  void stepHint;
  return (
    <div className={clsx("practice-flow-root", className)}>
      <div className="practice-flow-stack space-y-4 sm:space-y-5 w-full">{children}</div>
    </div>
  );
}
