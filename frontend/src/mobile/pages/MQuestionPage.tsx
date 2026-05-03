import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { questionsApi, attemptsApi } from "../../api";
import { Question, QUESTION_TYPE_LABELS } from "../../types";
import { MobileBackHeader } from "../layout/MobileShell";
import { MBadge, MErrorState, MSkeletonQuestion, MCompletionToast } from "../ui";
import { getMaxScore, normalizeHistoryScore, DETERMINISTIC_TYPES } from "../../constants/scoring";
import {
  ReadAloud,
  RepeatSentence,
  AudioWithMic,
  DescribeImage,
  SummarizeWrittenText,
  WriteEssay,
  MCQuestion,
  ReorderParagraphs,
  FillInBlanksReading,
  FillInBlanksRW,
  ListeningFIB,
  HighlightIncorrectWords,
  AudioTextAnswer,
} from "../../components/practice/QuestionTypes";
import { AudioPlayer, AnalysisTable } from "../../components/ui";
import { clsx } from "clsx";

// ── Bookmark hook ──────────────────────────────────────────────────────────────
function useBookmark(questionId: string) {
  const key = "fly_edu_bookmarks";
  const getAll = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };
  const [bookmarked, setBookmarked] = React.useState(() => getAll().includes(questionId));

  React.useEffect(() => {
    setBookmarked(getAll().includes(questionId));
  }, [questionId]);

  const toggle = () => {
    const all = getAll();
    const next = all.includes(questionId)
      ? all.filter((id) => id !== questionId)
      : [...all, questionId];
    localStorage.setItem(key, JSON.stringify(next));
    setBookmarked(!bookmarked);
  };

  return { bookmarked, toggle };
}

// ── Question body (reuses existing components) ─────────────────────────────────
function QuestionBody({ question, attempts, onSubmit }: { question: Question; attempts: any[]; onSubmit?: () => void }) {
  void onSubmit; // available for future per-type submit callbacks
  const { type } = question;

  if (type === "SPEAKING_READ_ALOUD")
    return <ReadAloud question={question} attempts={attempts} />;
  if (type === "SPEAKING_REPEAT_SENTENCE")
    return <RepeatSentence question={question} />;
  if (type === "SPEAKING_ANSWER_SHORT_QUESTION")
    return <AudioWithMic question={question} maxScore={getMaxScore(type)} />;
  if (
    type === "SPEAKING_RETELL_LECTURE" ||
    type === "SPEAKING_SUMMARISE_GROUP_DISCUSSION" ||
    type === "SPEAKING_RESPOND_TO_SITUATION"
  )
    return <AudioWithMic question={question} maxScore={getMaxScore(type)} />;
  if (type === "SPEAKING_DESCRIBE_IMAGE")
    return <DescribeImage question={question} />;

  if (type === "WRITING_SUMMARIZE_WRITTEN_TEXT")
    return <SummarizeWrittenText question={question} />;
  if (type === "WRITING_ESSAY")
    return <WriteEssay question={question} />;

  if (type === "READING_FIB_R_W")
    return <FillInBlanksRW question={question} />;
  if (type === "READING_FIB_R")
    return <FillInBlanksReading question={question} />;

  if (type === "READING_MCQ_MULTIPLE_ANSWER" || type === "LISTENING_MCQ_MULTIPLE_ANSWER") {
    if (type === "LISTENING_MCQ_MULTIPLE_ANSWER") {
      return (
        <div className="space-y-3 sm:space-y-4 pt-1">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 sm:p-3 mx-3 sm:mx-5">
            <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />
          </div>
          <MCQuestion question={question} multiple />
        </div>
      );
    }
    return <MCQuestion question={question} multiple />;
  }

  if (
    type === "READING_MCQ_SINGLE_ANSWER" ||
    type === "LISTENING_MCQ_SINGLE_ANSWER" ||
    type === "LISTENING_HIGHLIGHT_CORRECT_SUMMARY" ||
    type === "LISTENING_SELECT_MISSING_WORD"
  ) {
    const withAudio = type.startsWith("LISTENING_");
    const hideListeningStem =
      type === "LISTENING_HIGHLIGHT_CORRECT_SUMMARY" || type === "LISTENING_SELECT_MISSING_WORD";
    const qForMCQ =
      withAudio && hideListeningStem
        ? { ...question, content: undefined, title: undefined }
        : question;
    return (
      <div className="space-y-3 sm:space-y-4 pt-1">
        {withAudio && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 sm:p-3 mx-3 sm:mx-5">
            <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />
          </div>
        )}
        <MCQuestion question={qForMCQ as typeof question} multiple={false} />
      </div>
    );
  }

  if (type === "READING_RE_ORDER_PARAGRAPH")
    return <ReorderParagraphs question={question} />;
  if (type === "LISTENING_FIB_L")
    return <ListeningFIB question={question} />;
  if (type === "LISTENING_HIGHLIGHT_INCORRECT_WORD")
    return <HighlightIncorrectWords question={question} />;
  if (type === "LISTENING_DICTATION")
    return <AudioTextAnswer question={question} />;
  if (type === "LISTENING_SUMMARIZE_SPOKEN_TEXT")
    return <AudioTextAnswer question={question} minWords={50} maxWords={70} maxScore={12} />;

  return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-4xl mb-3">🚧</p>
      <p className="font-semibold">Dạng bài đang phát triển</p>
      <p className="text-sm mt-1">{type}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bookmarked, toggle: toggleBookmark } = useBookmark(id || "");
  const [showCompletion, setShowCompletion] = React.useState(false);

  const handleSubmitFeedback = React.useCallback(() => {
    setShowCompletion(true);
    setTimeout(() => setShowCompletion(false), 2500);
  }, []);

  const { data: question, isLoading, isError } = useQuery({
    queryKey: ["question", id],
    queryFn: () => questionsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: attemptsData } = useQuery({
    queryKey: ["attempts", id],
    queryFn: () => attemptsApi.getByQuestion(id!),
    enabled: !!id,
    refetchInterval: (data: any) => {
      const hasScoring = data?.some?.((a: any) => a.status === "SCORING");
      return hasScoring ? 2000 : false;
    },
  });

  const { data: prevQ } = useQuery({
    queryKey: ["adjacent", question?.code, "prev"],
    queryFn: () => questionsApi.getAdjacent(question!.code, "prev", question!.type),
    enabled: !!question,
  });

  const { data: nextQ } = useQuery({
    queryKey: ["adjacent", question?.code, "next"],
    queryFn: () => questionsApi.getAdjacent(question!.code, "next", question!.type),
    enabled: !!question,
  });

  if (isLoading) {
    return (
      <div className="mobile-page-full">
        <div className="practice-mobile-header !bg-white !border-b !border-gray-100 !shadow-none">
          <div className="flex items-center h-[56px] px-4 gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100" />
            <div className="h-4 w-1/3 m-skeleton rounded-lg" />
          </div>
        </div>
        <MSkeletonQuestion />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mobile-page-full flex flex-col">
        <div className="practice-mobile-header !bg-white !border-b !border-gray-100 !shadow-none">
          <div className="flex items-center h-[56px] px-4 gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="practice-mobile-body flex items-center justify-center">
          <MErrorState
            title="Không tải được câu hỏi"
            description="Kiểm tra kết nối mạng và thử lại."
          />
        </div>
      </div>
    );
  }

  if (!question || !id) {
    return (
      <div className="mobile-page-full flex items-center justify-center">
        <MErrorState title="Không tìm thấy câu hỏi" description="Câu hỏi này có thể đã bị xoá hoặc không tồn tại." />
      </div>
    );
  }

  const skillPath = question.skill.toLowerCase();
  const attempts = attemptsData || [];

  const isDeterministic = DETERMINISTIC_TYPES.has(question.type);
  const qMax = getMaxScore(question.type);

  const analysisRows = attempts.map((a: any) => ({
    id: a.id,
    timer: new Date(a.createdAt).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }),
    status: a.status,
    score: normalizeHistoryScore(a.totalScore, question.type),
    scoreMax: isDeterministic ? undefined : qMax,
    feedback: isDeterministic ? a.feedback : undefined,
    createdAt: a.createdAt,
  }));

  return (
    <div className="mobile-page-full bg-brand-cream">
      <MCompletionToast visible={showCompletion} />

      {/* Practice header */}
      <MobileBackHeader
        title={QUESTION_TYPE_LABELS[question.type as keyof typeof QUESTION_TYPE_LABELS]}
        onBack={() => navigate(`/practice/${skillPath}`)}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleBookmark}
              className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-colors",
                bookmarked
                  ? "bg-brand-gold border-brand-gold"
                  : "bg-gray-100 border-gray-200"
              )}
            >
              {bookmarked ? "🔖" : "☆"}
            </button>
          </div>
        }
      />

      {/* Content */}
      <div className="practice-mobile-body pb-[120px]">
        {/* Body: meta dính trên + nội dung bài */}
        <div className="bg-white rounded-t-3xl min-h-[60vh] shadow-sm border border-gray-100/90 border-b-0 overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
            <MBadge color="gray">{question.code}</MBadge>
            <MBadge
              color={
                question.level === "Easy" ? "green" : question.level === "Hard" ? "red" : "gold"
              }
            >
              {question.level}
            </MBadge>
            {question.isTrending && <MBadge color="orange">🔥 Trending</MBadge>}
            {question.isRepeated && <MBadge color="blue">🔁 Hay ra</MBadge>}
          </div>
          <QuestionBody question={question} attempts={attempts} onSubmit={handleSubmitFeedback} />
        </div>

        {/* Attempt history */}
        {analysisRows.length > 0 && (
          <div className="px-4 mt-4">
            <p className="m-section-label">Lịch sử luyện tập</p>
            <div className="m-card rounded-2xl overflow-hidden">
              <AnalysisTable rows={analysisRows} />
            </div>
          </div>
        )}

        {/* Tips */}
        {question.tips && (
          <div className="px-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1.5">
                💡 Tips & Tricks
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">{question.tips}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="practice-mobile-bottom">
        <div className="flex items-center gap-2 px-4 h-[60px]">
          {/* Previous */}
          <button
            disabled={!prevQ}
            onClick={() => prevQ && navigate(`/question/${prevQ.id}`)}
            className={clsx(
              "flex-1 h-10 rounded-xl flex items-center justify-center gap-1 font-bold text-sm border transition-all",
              prevQ
                ? "border-gray-200 text-gray-700 active:bg-gray-50"
                : "border-gray-100 text-gray-300 cursor-not-allowed"
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
            </svg>
            Trước
          </button>

          {/* Question list — navigate to list of same type */}
          <button
            onClick={() => navigate(`/practice/${skillPath}/${question.type.toLowerCase()}`)}
            className="h-10 px-3 rounded-xl bg-gray-100 flex items-center justify-center gap-1.5 text-gray-600 text-xs font-bold flex-shrink-0 active:bg-gray-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
            </svg>
            Chọn đề
          </button>

          {/* Next */}
          <button
            disabled={!nextQ}
            onClick={() => nextQ && navigate(`/question/${nextQ.id}`)}
            className={clsx(
              "flex-1 h-10 rounded-xl flex items-center justify-center gap-1 font-bold text-sm transition-all",
              nextQ
                ? "bg-brand-gold text-white shadow-gold-sm motion-safe:active:scale-[0.97]"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            )}
          >
            Tiếp
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
