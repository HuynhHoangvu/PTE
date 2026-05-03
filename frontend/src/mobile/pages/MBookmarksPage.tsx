import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { questionsApi } from "../../api";
import { QUESTION_TYPE_LABELS, QuestionType } from "../../types";
import { MobileBackHeader } from "../layout/MobileShell";
import { MBadge, MEmptyState, MErrorState, MSkeletonListRow } from "../ui";

function getBookmarkedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("fly_edu_bookmarks") || "[]");
  } catch {
    return [];
  }
}

function removeBookmark(id: string) {
  const all = getBookmarkedIds().filter((x) => x !== id);
  localStorage.setItem("fly_edu_bookmarks", JSON.stringify(all));
}

const SKILL_ICON: Record<string, string> = {
  SPEAKING: "🎙️",
  WRITING: "✍️",
  READING: "📖",
  LISTENING: "🎧",
};

const SKILL_COLOR: Record<string, "gold" | "blue" | "green" | "purple"> = {
  SPEAKING: "gold",
  WRITING: "blue",
  READING: "green",
  LISTENING: "purple",
};

export default function MBookmarksPage() {
  const navigate = useNavigate();
  const [ids, setIds] = React.useState<string[]>(getBookmarkedIds);

  const { data: questions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bookmarked-questions", ids.join(",")],
    queryFn: () => questionsApi.getByIds(ids),
    enabled: ids.length > 0,
  });

  const handleRemove = (id: string) => {
    removeBookmark(id);
    setIds(getBookmarkedIds());
    refetch();
  };

  return (
    <div className="mobile-page-full">
      <MobileBackHeader title="Câu đã đánh dấu" onBack={() => navigate(-1)} />

      <div className="practice-mobile-body px-4 py-4 space-y-2.5">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <MSkeletonListRow key={i} />
        ))}

        {!isLoading && isError && (
          <MErrorState
            title="Không tải được danh sách"
            description="Kiểm tra kết nối và thử lại."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && (ids.length === 0 || questions.length === 0) && (
          <MEmptyState
            icon="🔖"
            title="Chưa đánh dấu câu nào"
            description="Trong khi luyện tập, nhấn ☆ để lưu câu cần ôn lại sau."
            action={
              <button
                onClick={() => navigate("/dashboard")}
                className="m-btn-primary text-sm"
              >
                Bắt đầu luyện tập
              </button>
            }
          />
        )}

        {!isLoading && !isError && (questions as any[]).map((q: any) => (
          <div key={q.id} className="m-card-elevated rounded-2xl p-4 motion-safe:animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-gold-soft flex items-center justify-center text-base flex-shrink-0">
                {SKILL_ICON[q.skill] || "📌"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <MBadge color={SKILL_COLOR[q.skill] || "gray"}>
                    {SKILL_ICON[q.skill]} {q.skill?.toLowerCase()}
                  </MBadge>
                </div>
                <p className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                  {q.title || QUESTION_TYPE_LABELS[q.type as QuestionType]}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{q.code}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/question/${q.id}`)}
                className="flex-1 m-btn-primary m-btn-sm text-xs"
              >
                Luyện lại
              </button>
              <button
                onClick={() => handleRemove(q.id)}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 motion-safe:active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        <div className="h-4" />
      </div>
    </div>
  );
}
