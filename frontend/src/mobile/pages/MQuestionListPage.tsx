import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { questionsApi } from "../../api";
import { QuestionSkill, QuestionType, QUESTION_TYPE_LABELS } from "../../types";
import { getQuestionListPreview } from "../../utils/questionListPreview";
import { MobileBackHeader } from "../layout/MobileShell";
import { MSkeleton } from "../ui";

const TYPE_ICONS: Partial<Record<QuestionType, string>> = {
  SPEAKING_READ_ALOUD: "🔊",
  SPEAKING_REPEAT_SENTENCE: "🔁",
  SPEAKING_DESCRIBE_IMAGE: "🖼️",
  SPEAKING_RETELL_LECTURE: "🎓",
  SPEAKING_ANSWER_SHORT_QUESTION: "❓",
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: "👥",
  SPEAKING_RESPOND_TO_SITUATION: "💬",
  WRITING_SUMMARIZE_WRITTEN_TEXT: "📄",
  WRITING_ESSAY: "✏️",
  READING_FIB_R_W: "📝",
  READING_MCQ_MULTIPLE_ANSWER: "☑️",
  READING_RE_ORDER_PARAGRAPH: "🔀",
  READING_FIB_R: "🔲",
  READING_MCQ_SINGLE_ANSWER: "🔘",
  LISTENING_SUMMARIZE_SPOKEN_TEXT: "📋",
  LISTENING_MCQ_MULTIPLE_ANSWER: "☑️",
  LISTENING_FIB_L: "⬜",
  LISTENING_HIGHLIGHT_CORRECT_SUMMARY: "✅",
  LISTENING_MCQ_SINGLE_ANSWER: "🔘",
  LISTENING_SELECT_MISSING_WORD: "🔍",
  LISTENING_HIGHLIGHT_INCORRECT_WORD: "🔆",
  LISTENING_DICTATION: "✍️",
};

const PAGE_SIZE = 20;

export default function MQuestionListPage() {
  const { skill, type } = useParams<{ skill: string; type: string }>();
  const navigate = useNavigate();
  const qType = (type || "").toUpperCase() as QuestionType;
  const skillKey = (skill || "").toUpperCase() as QuestionSkill;
  const label = QUESTION_TYPE_LABELS[qType] || qType;
  const icon = TYPE_ICONS[qType] || "📌";
  const [randomBusy, setRandomBusy] = React.useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["questions-list", qType],
    queryFn: ({ pageParam = 1 }) =>
      questionsApi.list({ type: qType, page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last: any, pages) => {
      const total = last.total ?? 0;
      return pages.length * PAGE_SIZE < total ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!qType,
  });

  const questions = data?.pages.flatMap((p: any) => p.data ?? []) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const goRandom = async () => {
    if (!qType) return;
    setRandomBusy(true);
    try {
      const q = await questionsApi.random({ type: qType, skill: skillKey });
      if (q?.id) navigate(`/question/${q.id}`);
    } catch {
      alert("Chưa có câu trong dạng này hoặc lỗi mạng. Thử lại sau.");
    } finally {
      setRandomBusy(false);
    }
  };

  return (
    <div className="mobile-page-full">
      <MobileBackHeader
        title={`${icon} ${label}`}
        onBack={() => navigate(`/practice/${skill}`)}
        right={
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl">
            {total} câu
          </span>
        }
      />

      <div className="practice-mobile-body px-4 py-3 space-y-2">
        <button
          type="button"
          onClick={goRandom}
          disabled={randomBusy || isLoading || total === 0}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-gray-900 bg-gradient-to-r from-amber-100 to-brand-gold/30 border-2 border-brand-gold/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {randomBusy ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              Đang chọn…
            </>
          ) : (
            <>🎲 Câu ngẫu nhiên{total > 0 ? ` (trong ${total} câu)` : ""}</>
          )}
        </button>

        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <MSkeleton key={i} className="h-20 rounded-2xl" />
            ))
          : questions.map((q: any, idx: number) => (
              <QuestionCard
                key={q.id}
                index={idx + 1}
                question={q}
                onPress={() => navigate(`/question/${q.id}`)}
              />
            ))}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 active:bg-gray-50 transition-colors"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-brand-gold rounded-full animate-spin" />
                Đang tải...
              </span>
            ) : (
              "Tải thêm →"
            )}
          </button>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  onPress,
}: {
  index: number;
  question: any;
  onPress: () => void;
}) {
  const hasDone = question.latestScore !== undefined && question.latestScore !== null;
  const preview = getQuestionListPreview(question, 80);

  return (
    <button
      onClick={onPress}
      className="w-full m-card-elevated rounded-2xl px-4 py-3.5 text-left active:scale-[0.98] transition-all flex items-start gap-3"
    >
      <div
        className={clsx(
          "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5",
          hasDone
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        )}
      >
        {hasDone ? "✓" : index}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2">
          {preview || `Câu ${index}`}
        </p>
        {question.imageUrl && (
          <span className="text-[10px] text-blue-500 font-medium mt-0.5 inline-block">
            🖼️ Có hình ảnh
          </span>
        )}
        {question.audioUrl && (
          <span className="text-[10px] text-purple-500 font-medium mt-0.5 inline-block">
            🎧 Có audio
          </span>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {hasDone && (
          <span className="text-[11px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
            {(question.latestScore ?? question.userScore) as number}đ
          </span>
        )}
        <svg
          className="w-4 h-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path d="M9 18l6-6-6-6" strokeLinecap="round" />
        </svg>
      </div>
    </button>
  );
}
