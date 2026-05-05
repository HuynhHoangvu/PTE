import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { questionsApi, attemptsApi } from '../../api';
import { Question, QUESTION_TYPE_LABELS } from '../../types';
import { Button, QuestionListDrawer, AnalysisTable } from '../ui';
import { clsx } from 'clsx';
import { DETERMINISTIC_TYPES, getPracticeDisplayMax, normalizeHistoryScore } from '../../constants/scoring';
import { getExamInstruction } from '../../constants/examInstructions';

function useBookmark(questionId: string) {
  const key = 'fly_edu_bookmarks';
  const getAll = (): string[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
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

interface PracticeLayoutProps {
  questionId: string;
  children: (question: Question, attempts: any[]) => React.ReactNode;
}

export function PracticeLayout({ questionId, children }: PracticeLayoutProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [randomBusy, setRandomBusy] = React.useState(false);
  const { bookmarked, toggle: toggleBookmark } = useBookmark(questionId);

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => questionsApi.getOne(questionId),
    enabled: !!questionId,
  });

  const { data: attemptsData } = useQuery({
    queryKey: ['attempts', questionId],
    queryFn: () => attemptsApi.getByQuestion(questionId),
    enabled: !!questionId,
    refetchInterval: (data: any) => {
      const hasScoring = data?.some?.((a: any) => a.status === 'SCORING');
      return hasScoring ? 2000 : false;
    },
  });

  const { data: questionList } = useQuery({
    queryKey: ['questionList', question?.type, page],
    queryFn: () => questionsApi.list({ type: question?.type, page, limit: 50 }),
    enabled: !!question?.type,
  });

  const { data: prevQ } = useQuery({
    queryKey: ['adjacent', question?.code, 'prev'],
    queryFn: () => questionsApi.getAdjacent(question!.code, 'prev', question!.type),
    enabled: !!question,
  });

  const { data: nextQ } = useQuery({
    queryKey: ['adjacent', question?.code, 'next'],
    queryFn: () => questionsApi.getAdjacent(question!.code, 'next', question!.type),
    enabled: !!question,
  });

  const handleRandomFromDrawer = async () => {
    if (!question) return;
    setRandomBusy(true);
    try {
      const q = await questionsApi.random({ type: question.type, skill: question.skill });
      if (q?.id) {
        navigate(`/question/${q.id}`);
        setDrawerOpen(false);
      }
    } catch {
      window.alert('Không lấy được câu ngẫu nhiên. Thử lại hoặc kiểm tra ngân hàng câu.');
    } finally {
      setRandomBusy(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!question) return <div className="p-8 text-center text-gray-500">Question not found</div>;

  const skillPath = question.skill.toLowerCase();
  const attempts = attemptsData || [];

  const isDeterministic = DETERMINISTIC_TYPES.has(question.type);
  const qMax = getPracticeDisplayMax(question);

  const analysisRows = attempts.map((a: any) => ({
    id: a.id,
    timer: new Date(a.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    status: a.status,
    score: normalizeHistoryScore(a.totalScore, question.type),
    scoreMax: isDeterministic ? undefined : qMax,
    feedback: isDeterministic ? a.feedback : undefined,
    createdAt: a.createdAt,
  }));

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* ── TOP NAV ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 motion-safe:animate-fade-in-down">
        {/* Row 1: back + title + right actions */}
        <div className="flex items-center justify-between px-3 sm:px-6 h-14 gap-2">
          {/* Left: back + meta */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(`/practice/${skillPath}`)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-black
                         border border-gray-200 rounded-lg px-2.5 py-1.5 transition-all hover:border-gray-400 shrink-0"
              aria-label="Quay lại"
            >
              ←<span className="hidden sm:inline ml-0.5">Back</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-brand-charcoal rounded-lg flex items-center justify-center text-brand-gold-bright text-xs font-black shrink-0">
                {question.skill[0]}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-gray-900 leading-none truncate">
                  {QUESTION_TYPE_LABELS[question.type as keyof typeof QUESTION_TYPE_LABELS]}
                </p>
                <p className="text-[10px] text-gray-400 hidden sm:block">{question.skill} · AI Scoring</p>
              </div>
            </div>
          </div>

          {/* Right: code + desktop actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 sm:px-3 py-1.5 rounded-lg">
              {question.code}
            </div>
            {/* Bookmark — always visible */}
            <button
              onClick={toggleBookmark}
              className={clsx(
                'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0',
                bookmarked
                  ? 'bg-brand-gold border-brand-gold text-white'
                  : 'border-gray-200 text-gray-400 hover:text-brand-gold hover:border-amber-200',
              )}
              title={bookmarked ? 'Bỏ bookmark' : 'Bookmark câu này'}
            >
              🔖
            </button>
            {/* Desktop-only actions */}
            <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => setDrawerOpen(true)}>
              ☰ Question list
            </Button>
            <Button
              variant="ghost" size="sm"
              className="hidden md:flex"
              disabled={!prevQ}
              onClick={() => prevQ && navigate(`/question/${prevQ.id}`)}
            >
              ← Previous
            </Button>
            <Button
              variant="yellow" size="sm"
              className="hidden md:flex"
              disabled={!nextQ}
              onClick={() => nextQ && navigate(`/question/${nextQ.id}`)}
            >
              Next →
            </Button>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      {/* Đệm đáy lớn trên mobile để thanh Prev/List/Next (fixed) không che nút mic / waveform */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 space-y-5 pb-40 max-md:pb-[11rem] md:pb-8">
        {/* Question Card */}
        <div className="card overflow-hidden">
          {/* Question Header — stacked on mobile, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-3.5 sm:px-5 py-3 sm:py-4 border-b border-gray-100 gap-2.5 sm:gap-3">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-gold-light rounded-xl flex items-center justify-center text-base sm:text-lg ring-1 ring-amber-100 shrink-0">🎓</div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm sm:text-lg text-gray-900">{question.code}</p>
                <p className="text-[13px] sm:text-sm text-gray-600 mt-0.5 leading-snug sm:leading-relaxed">
                  {getExamInstruction(question)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {question.isRepeated && (
                <span className="text-[10px] font-black px-2 py-1 bg-pink-500 text-white rounded uppercase tracking-wide">REPEATED</span>
              )}
            </div>
          </div>

          {/* Question Content */}
          {children(question, attempts)}
        </div>

        {/* Analysis Section */}
        <AnalysisTable rows={analysisRows} />
      </div>

      {/* ── MOBILE BOTTOM NAV BAR ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md
                   border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center px-3 py-2 gap-1.5"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="ghost" size="sm"
          className="flex-1 justify-center"
          disabled={!prevQ}
          onClick={() => prevQ && navigate(`/question/${prevQ.id}`)}
        >
          ← Prev
        </Button>
        <Button
          variant="ghost" size="sm"
          className="flex-1 justify-center"
          onClick={() => setDrawerOpen(true)}
        >
          ☰ List
        </Button>
        <Button
          variant="yellow" size="sm"
          className="flex-1 justify-center"
          disabled={!nextQ}
          onClick={() => nextQ && navigate(`/question/${nextQ.id}`)}
        >
          Next →
        </Button>
      </nav>

      {/* Question List Drawer */}
      <QuestionListDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={(questionList?.data || [])
          .filter((q: any) => q.type !== 'SPEAKING_DESCRIBE_IMAGE' || !!q.imageUrl)
          .map((q: any) => ({
            id: q.id, code: q.code, title: q.title,
            level: q.level, isTrending: q.isTrending, isRepeated: q.isRepeated,
            userScore: q.userScore,
          }))}
        currentCode={question.code}
        onSelect={(id) => navigate(`/question/${id}`)}
        total={questionList?.total || 0}
        page={page}
        onPageChange={setPage}
        onRandom={handleRandomFromDrawer}
        randomBusy={randomBusy}
      />
    </div>
  );
}
