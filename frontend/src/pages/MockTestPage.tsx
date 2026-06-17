import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { mockTestApi, attemptsApi } from '../api';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, AudioPlayer, Waveform } from '../components/ui';
import { Question, QUESTION_TYPE_LABELS } from '../types';
import { useRecorder } from '../hooks/useRecorder';
import { parseReadingFibDrag } from '../utils/readingFibDrag';
import { parseListeningFibSegments } from '../utils/listeningFibSegments';
import { AIConsentModal } from '../components/ui/AIConsentModal';

// ── Mock Test Library Page ─────────────────────────────────────────────────
export function MockTestPage() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<'library' | 'history'>('library');

  const { data: tests } = useQuery({ queryKey: ['mockTests'], queryFn: mockTestApi.list });
  const { data: history } = useQuery({ queryKey: ['mockHistory'], queryFn: mockTestApi.getHistory });

  const getStatus = (id: string) => {
    if (!history) return 'todo';
    const h = history.find((h: any) => h.mockTestId === id);
    if (!h) return 'todo';
    return h.status === 'COMPLETED' ? 'done' : 'progress';
  };

  const getScore = (id: string) => {
    if (!history) return null;
    const h = history.find((h: any) => h.mockTestId === id && h.status === 'COMPLETED');
    return h?.totalScore;
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-brand-cream">
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <h1 className="font-display font-black text-lg">Welcome to mock test</h1>
        </div>

        <div className="px-6 sm:px-8 py-6 max-w-7xl mx-auto w-full">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {(['library', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px',
                  tab === t ? 'border-brand-black text-brand-black' : 'border-transparent text-gray-400 hover:text-gray-700'
                )}>
                {t === 'library' ? 'Mock Test Library' : 'History'}
              </button>
            ))}
          </div>

          {tab === 'library' && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="font-display font-bold text-sm">Mock Test Library</h2>
              </div>
              {(tests || []).map((mt: any) => {
                const status = getStatus(mt.id);
                const score = getScore(mt.id);
                return (
                  <div key={mt.id}
                    className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 hover:bg-brand-yellow-soft/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/mock-test/${mt.id}`)}>
                    <div className="w-14 h-14 bg-brand-yellow-light rounded-xl flex flex-col items-center justify-center flex-shrink-0 border-2 border-brand-yellow/30">
                      <span className="text-[7px] font-black text-brand-yellow-deep uppercase tracking-wide">Mock Test</span>
                      <span className="font-display font-black text-lg text-brand-black leading-none">#{mt.code?.replace(/\D/g,'').slice(-2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 mb-0.5">{mt.title}</p>
                      <p className="text-xs text-gray-400 mb-1.5">{mt.description}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-brand-yellow-light text-brand-yellow-deep font-bold px-2 py-0.5 rounded">📅 Updated: {mt.updatedYear}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {score && <span className="font-display font-black text-brand-orange">{score}/90</span>}
                      <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1',
                        status === 'done' ? 'bg-green-100 text-green-700' :
                        status === 'progress' ? 'bg-orange-100 text-brand-orange-deep' : 'bg-gray-100 text-gray-400'
                      )}>
                        {status === 'done' ? '✓ Done' : status === 'progress' ? '⏳ In progress' : '○ Not yet taken'}
                      </span>
                      <button className="text-sm font-bold text-brand-orange hover:underline whitespace-nowrap">
                        {status === 'done' ? 'Xem lại →' : status === 'progress' ? 'Tiếp tục →' : 'Practice now →'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!tests || tests.length === 0) && (
                <div className="py-16 text-center text-gray-400"><p className="text-3xl mb-3">📝</p><p>Chưa có mock test nào</p></div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="card overflow-hidden">
              {(history || []).map((h: any) => (
                <div key={h.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{h.mockTest?.title || 'Mock Test'}</p>
                    <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className={clsx('text-[10px] font-bold px-2 py-1 rounded',
                    h.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  )}>{h.status}</span>
                  {h.totalScore != null && (
                    <span className="font-display font-black text-brand-orange">
                      AI: {Math.round(h.totalScore)}
                    </span>
                  )}
                </div>
              ))}
              {(!history || history.length === 0) && (
                <div className="py-16 text-center text-gray-400"><p className="text-3xl mb-3">📊</p><p>Chưa có lịch sử thi</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// ── Mock Test Exam Page (full screen) ─────────────────────────────────────
export function MockTestExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attemptData, setAttemptData] = React.useState<any>(null);
  const [mockTestData, setMockTestData] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [started, setStarted] = React.useState(false);

  const startMutation = useMutation({
    mutationFn: () => mockTestApi.startAttempt(id!),
    onSuccess: (data) => {
      setAttemptData(data.attempt);
      setMockTestData(data.mockTest);
      setQuestions(data.questions || []);
      setTimeLeft(data.attempt.timeRemainingSeconds || (data.mockTest?.durationMinutes || 180) * 60);
      setCurrentIdx(data.attempt.currentQuestionIndex || 0);
      setAnswers(data.attempt.answers || {});
      setStarted(true);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => mockTestApi.submitAttempt(attemptData.id),
    onSuccess: (data) => navigate(`/mock-test/result/${attemptData?.id || data?.attemptId || ''}`),
  });

  // Timer
  React.useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { clearInterval(t); submitMutation.mutate(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  // Auto-save every 30s
  React.useEffect(() => {
    if (!started || !attemptData) return;
    const t = setInterval(() => {
      mockTestApi.saveProgress(attemptData.id, {
        answers, currentQuestionIndex: currentIdx, timeRemainingSeconds: timeLeft,
      });
    }, 30000);
    return () => clearInterval(t);
  }, [started, answers, currentIdx, timeLeft]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const currentQ = questions[currentIdx];
  const sections = mockTestData?.sections || { speaking: [], writing: [], reading: [], listening: [] };

  // Determine current section index
  const speakingCount = sections.speaking?.length || 0;
  const writingCount = sections.writing?.length || 0;
  const readingCount = sections.reading?.length || 0;
  const currentSectionIdx =
    currentIdx < speakingCount ? 0 :
    currentIdx < speakingCount + writingCount ? 1 :
    currentIdx < speakingCount + writingCount + readingCount ? 2 : 3;

  const getSectionCount = (qids: string[]) => {
    const answered = qids.filter((qid) => answers[qid] !== undefined).length;
    return `${answered}/${qids.length}`;
  };

  const setAnswer = (qid: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: answer }));
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="card p-10 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🎯</p>
          <h1 className="font-display font-black text-2xl mb-2">Sẵn sàng thi thử?</h1>
          <p className="text-sm text-gray-500 mb-6">Bài thi gồm Speaking, Writing, Reading và Listening. Thời gian: 3 giờ.</p>
          <Button variant="yellow" onClick={() => startMutation.mutate()} loading={startMutation.isPending} className="w-full py-3 text-base">
            🚀 Bắt đầu thi
          </Button>
          <button onClick={() => navigate('/mock-test')} className="mt-3 text-sm text-gray-400 hover:text-gray-700">← Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 sm:px-8 h-[3.25rem] sm:h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-yellow rounded-lg flex items-center justify-center text-base sm:text-lg">✈️</div>
          <span className="font-display font-black text-base sm:text-lg">FlyEdu</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">Time remaining</span>
          <span className={clsx('font-display font-black text-xl sm:text-2xl tabular-nums', timeLeft < 600 ? 'text-red-500' : 'text-brand-black')}>
            {fmt(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Bạn có chắc muốn thoát?')) navigate('/mock-test'); }}>Exit</Button>
        </div>
      </header>

      {/* Content — rộng hơn để đọc bài / xem biểu đồ Describe Image */}
      <div className="flex-1 w-full max-w-[min(100%,92rem)] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
        {currentQ ? (
          <div className="card overflow-hidden shadow-md border-gray-200/80">
            {/* Question Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-yellow rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0">🎓</div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg sm:text-xl truncate">{currentQ.code}</p>
                  <p className="text-sm text-gray-500 truncate">{QUESTION_TYPE_LABELS[currentQ.type]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-gray-400 tabular-nums shrink-0">
                  {currentIdx + 1}/{questions.length}
                </span>
                {answers[currentQ.id] !== undefined && (
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-1 rounded">✓ Answered</span>
                )}
              </div>
            </div>

            {/* Question Body — key forces full remount on question change, resetting all recorder state */}
            <ExamQuestionBody
              key={currentQ.id}
              question={currentQ}
              currentAnswer={answers[currentQ.id]}
              onChange={(answer) => setAnswer(currentQ.id, answer)}
            />
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400">Đang tải câu hỏi...</div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-gray-100 px-4 sm:px-8 min-h-[4rem] py-2 flex flex-wrap items-center justify-between gap-y-2 sticky bottom-0 z-40">
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-0.5 max-w-full">
          {[
            { label: 'Speaking', qids: sections.speaking || [] },
            { label: 'Writing', qids: sections.writing || [] },
            { label: 'Reading', qids: sections.reading || [] },
            { label: 'Listening', qids: sections.listening || [] },
          ].map((s, i) => (
            <div key={s.label} className={clsx('text-sm sm:text-base whitespace-nowrap transition-colors shrink-0', i === currentSectionIdx ? 'font-bold border-b-2 border-brand-black pb-0.5' : 'text-gray-400')}>
              <p>{s.label}</p>
              <p className="text-xs sm:text-sm opacity-90">{getSectionCount(s.qids)} câu</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx((p) => p - 1)}>← Prev</Button>
          {currentIdx < questions.length - 1 ? (
            <Button variant="yellow" size="sm" onClick={() => setCurrentIdx((p) => p + 1)}>Next →</Button>
          ) : (
            <Button variant="orange" size="sm" onClick={() => { if (confirm('Nộp bài?')) submitMutation.mutate(); }} loading={submitMutation.isPending}>
              Nộp bài ✓
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exam Question Renderer ─────────────────────────────────────────────────
function ExamQuestionBody({ question, currentAnswer, onChange }: {
  question: Question;
  currentAnswer: any;
  onChange: (answer: any) => void;
}) {
  const { type } = question;

  // Speaking types - all use mic recorder with AI submission
  if (type.startsWith('SPEAKING_')) {
    return (
      <ExamSpeakingSection
        question={question}
        currentAnswer={currentAnswer}
        onAnswered={onChange}
      />
    );
  }

  // Writing - Essay
  if (type === 'WRITING_ESSAY') {
    return (
      <ExamTextAnswer
        question={question}
        value={currentAnswer || ''}
        onChange={onChange}
        placeholder="Write your essay here..."
        rows={10}
        minWords={200}
        maxWords={300}
      />
    );
  }

  // Writing - Summarize Written Text
  if (type === 'WRITING_SUMMARIZE_WRITTEN_TEXT') {
    return (
      <ExamTextAnswer
        question={question}
        value={currentAnswer || ''}
        onChange={onChange}
        placeholder="Type your one-sentence summary..."
        rows={4}
        maxWords={75}
      />
    );
  }

  // Listening - Summarize Spoken Text
  if (type === 'LISTENING_SUMMARIZE_SPOKEN_TEXT') {
    return (
      <ExamTextAnswer
        question={question}
        value={currentAnswer || ''}
        onChange={onChange}
        placeholder="Write a summary (50-70 words)..."
        rows={5}
        minWords={50}
        maxWords={70}
        withAudio
      />
    );
  }

  // Listening - Dictation
  if (type === 'LISTENING_DICTATION') {
    return (
      <ExamTextAnswer
        question={question}
        value={currentAnswer || ''}
        onChange={onChange}
        placeholder="Type exactly what you hear..."
        rows={3}
        withAudio
      />
    );
  }

  // MCQ Multiple
  if (type === 'READING_MCQ_MULTIPLE_ANSWER' || type === 'LISTENING_MCQ_MULTIPLE_ANSWER') {
    return (
      <ExamMCQ
        question={question}
        multiple
        value={currentAnswer || []}
        onChange={onChange}
        withAudio={type.startsWith('LISTENING_')}
      />
    );
  }

  // MCQ Single + listening variants
  if (type === 'READING_MCQ_SINGLE_ANSWER' || type === 'LISTENING_MCQ_SINGLE_ANSWER' ||
      type === 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY' || type === 'LISTENING_SELECT_MISSING_WORD') {
    return (
      <ExamMCQ
        question={question}
        multiple={false}
        value={currentAnswer ? [currentAnswer] : []}
        onChange={(v: string[]) => onChange(v[0])}
        withAudio={type.startsWith('LISTENING_')}
      />
    );
  }

  // Reorder paragraphs
  if (type === 'READING_RE_ORDER_PARAGRAPH') {
    return (
      <ExamReorder
        question={question}
        value={currentAnswer || []}
        onChange={onChange}
      />
    );
  }

  // Reading FIB (drag words)
  if (type === 'READING_FIB_R' || type === 'READING_FIB_R_W') {
    return (
      <ExamFIB
        question={question}
        value={currentAnswer || {}}
        onChange={onChange}
      />
    );
  }

  // Listening FIB (type in blanks)
  if (type === 'LISTENING_FIB_L') {
    return (
      <ExamListeningFIB
        question={question}
        value={currentAnswer || {}}
        onChange={onChange}
      />
    );
  }

  // Highlight incorrect words
  if (type === 'LISTENING_HIGHLIGHT_INCORRECT_WORD') {
    return (
      <ExamHighlightWords
        question={question}
        value={currentAnswer || []}
        onChange={onChange}
      />
    );
  }

  return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-3xl mb-2">🚧</p>
      <p className="text-sm">{type} - chưa hỗ trợ</p>
    </div>
  );
}

// ── Speaking Section ──────────────────────────────────────────────────────
function ExamSpeakingSection({ question, currentAnswer, onAnswered }: {
  question: Question;
  currentAnswer: any;
  onAnswered: (answer: any) => void;
}) {
  const answered    = currentAnswer !== undefined;
  const attemptId   = typeof currentAnswer === 'object' ? currentAnswer?.attemptId : null;
  const [reRecord,   setReRecord]   = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [aiScore,    setAiScore]    = React.useState<number | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for AI score after submission
  React.useEffect(() => {
    if (!attemptId || aiScore !== null) return;
    const poll = async () => {
      try {
        const res = await attemptsApi.pollScore(attemptId);
        if (res.status === 'SCORED' && res.totalScore != null) {
          setAiScore(res.totalScore);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [attemptId]);

  const showMic = !answered || reRecord;

  const { state, elapsed, audioUrl, startRecording, stopRecording, reset, showConsentModal, acceptConsent, declineConsent } = useRecorder({
    prepSeconds: 0,
    maxSeconds: question.responseTime || 40,
    onStop: async (blob: Blob, duration: number) => {
      setSubmitting(true);
      try {
        const result = await attemptsApi.submitSpeaking(question.id, blob, duration);
        onAnswered({ attemptId: result.id });
        setAiScore(null); // reset so polling starts
      } catch {
        onAnswered({ attemptId: null }); // offline fallback
      } finally {
        setSubmitting(false);
        setReRecord(false);
      }
    },
  });

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const isReadAloud    = question.type === 'SPEAKING_READ_ALOUD';
  const isDescribeImage = question.type === 'SPEAKING_DESCRIBE_IMAGE';
  const hasAudio = !isReadAloud && !isDescribeImage && question.audioUrl;
  /** Giống phòng thi PTE: chỉ nghe, không đọc transcript thay cho audio. */
  const audioOnlySpeaking = new Set<string>([
    'SPEAKING_REPEAT_SENTENCE',
    'SPEAKING_RETELL_LECTURE',
    'SPEAKING_ANSWER_SHORT_QUESTION',
    'SPEAKING_SUMMARISE_GROUP_DISCUSSION',
  ]);
  const hideTranscriptAsReading = audioOnlySpeaking.has(question.type);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {isReadAloud && question.content && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
          <p className="text-[15px] sm:text-base leading-relaxed text-gray-800">{question.content}</p>
        </div>
      )}

      {isDescribeImage && (
        question.imageUrl ? (
          <div
            className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-2 sm:p-4 flex items-center justify-center
                       min-h-[min(52vh,520px)] max-h-[min(78vh,900px)] w-full"
          >
            <img
              src={question.imageUrl}
              alt="Describe this chart or image"
              className="w-full h-auto max-h-[min(74vh,860px)] object-contain rounded-lg shadow-sm"
            />
          </div>
        ) : (
          <div className="min-h-[12rem] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-base">
            Image not available
          </div>
        )
      )}

      {hasAudio && <AudioPlayer src={question.audioUrl} countdownSeconds={5} showSpeedControl />}

      {!isReadAloud && !isDescribeImage && !hasAudio && hideTranscriptAsReading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 sm:px-6 text-center space-y-2">
          <p className="text-sm sm:text-base font-bold text-amber-900">Chưa có bản ghi âm cho câu này</p>
          <p className="text-xs sm:text-sm text-amber-800/90 max-w-lg mx-auto leading-relaxed">
            Trong thi thật bạn chỉ <strong>nghe</strong> hội thoại / câu đọc, không xem transcript.
            Cần gắn <span className="font-mono text-[11px]">audioUrl</span> trong câu hỏi (admin / crawl) để phát được ở đây.
          </p>
        </div>
      )}

      {!isReadAloud && !isDescribeImage && !hasAudio && question.content && !hideTranscriptAsReading && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
          <p className="text-[15px] sm:text-base text-gray-800 leading-relaxed">{question.content}</p>
        </div>
      )}

      {/* Mic / recorded area */}
      {showMic ? (
        <div className="flex flex-col items-center gap-4 py-2 sm:py-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 py-5 px-6 sm:px-10 flex flex-col items-center w-full max-w-3xl">
            <Waveform active={state === 'recording'} />
            {state === 'recording' && (
              <span className="text-sm text-gray-500 mt-2">{fmt(elapsed)} / {fmt(question.responseTime || 40)}</span>
            )}
          </div>
          <div className="flex items-center gap-5">
            {state !== 'recording' && (
              <button onClick={reset} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-lg" title="Ghi lại">
                🔄
              </button>
            )}
            {state === 'idle' && (
              <button onClick={startRecording}
                className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full bg-brand-yellow hover:bg-brand-yellow-deep flex items-center justify-center text-3xl shadow-lg">
                🎙️
              </button>
            )}
            {state === 'recording' && (
              <button onClick={stopRecording}
                className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-3xl">
                ⏹️
              </button>
            )}
            {(state === 'stopped' || submitting) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                {submitting ? 'Đang gửi...' : 'Đang xử lý...'}
              </div>
            )}
          </div>
          {audioUrl && state === 'stopped' && !submitting && (
            <audio controls src={audioUrl} className="w-full h-8 mt-1" />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center text-lg">✅</div>
            <div>
              <span className="text-sm font-bold text-green-600 block">Đã ghi âm</span>
              {/* AI score display */}
              {aiScore !== null ? (
                <span className="text-xs font-bold text-brand-gold">AI Score: {Math.round(aiScore)}/90</span>
              ) : attemptId ? (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                  Đang chấm điểm AI...
                </span>
              ) : null}
            </div>
            <button
              onClick={() => { setReRecord(true); reset(); setAiScore(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-2">
              Ghi lại
            </button>
          </div>
        </div>
      )}

      <AIConsentModal
        isOpen={showConsentModal}
        onAccept={acceptConsent}
        onDecline={declineConsent}
      />
    </div>
  );
}

// ── MCQ ───────────────────────────────────────────────────────────────────
function ExamMCQ({ question, multiple, value, onChange, withAudio }: {
  question: Question;
  multiple: boolean;
  value: string[];
  onChange: (v: string[]) => void;
  withAudio?: boolean;
}) {
  const options: { label: string; text: string }[] = question.options || [];

  const toggle = (label: string) => {
    if (multiple) {
      const next = value.includes(label) ? value.filter((x) => x !== label) : [...value, label];
      onChange(next);
    } else {
      onChange([label]);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {withAudio && question.audioUrl && (
        <AudioPlayer src={question.audioUrl} countdownSeconds={5} showSpeedControl />
      )}
      {question.content && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200 max-h-60 sm:max-h-72 lg:max-h-80 overflow-y-auto">
          <p className="text-[15px] sm:text-base leading-relaxed text-gray-800">{question.content}</p>
        </div>
      )}
      {question.title && <p className="text-base sm:text-lg font-bold text-gray-800">{question.title}</p>}
      <div className="space-y-2.5">
        {options.map((opt) => {
          const isSelected = value.includes(opt.label);
          return (
            <label
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={clsx(
                'flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all',
                isSelected ? 'border-brand-yellow bg-brand-yellow-soft' : 'border-gray-200 bg-white hover:border-brand-yellow hover:bg-brand-yellow-soft/50'
              )}
            >
              {multiple
                ? <div className={clsx('w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center', isSelected ? 'bg-brand-yellow border-brand-yellow' : 'border-gray-300')}>{isSelected && <span className="text-[9px] font-black">✓</span>}</div>
                : <div className={clsx('w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0', isSelected ? 'border-brand-yellow' : 'border-gray-300')}>{isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-yellow m-auto mt-0.5" />}</div>
              }
              <div className="flex gap-2 flex-1 min-w-0">
                <span className="text-sm font-black text-gray-400 mt-0.5 shrink-0">{opt.label}</span>
                <span className="text-[15px] sm:text-base text-gray-800 leading-snug">{opt.text}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Text Answer ───────────────────────────────────────────────────────────
function ExamTextAnswer({ question, value, onChange, placeholder, rows = 5, minWords, maxWords, withAudio }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  minWords?: number;
  maxWords?: number;
  withAudio?: boolean;
}) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const isOver = maxWords && wordCount > maxWords;
  const isUnder = minWords && wordCount < minWords;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {withAudio && question.audioUrl && (
        <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />
      )}
      {question.content && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200 max-h-60 sm:max-h-72 lg:max-h-80 overflow-y-auto">
          <p className="text-[15px] sm:text-base leading-relaxed text-gray-800">{question.content}</p>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-gray-200 rounded-xl p-4 sm:p-5 text-[15px] sm:text-base text-gray-800 resize-none focus:outline-none focus:border-brand-yellow transition-colors placeholder-gray-300 min-h-[8rem]"
        placeholder={placeholder}
      />
      <div className="flex justify-between items-center">
        <span className={clsx('text-sm font-semibold',
          isOver ? 'text-red-500' : isUnder ? 'text-gray-400' : 'text-green-600'
        )}>
          {wordCount}{maxWords ? `/${maxWords}` : ''} words
          {isOver ? ' ⚠️ Too long' : isUnder ? ` (min ${minWords})` : ''}
        </span>
      </div>
    </div>
  );
}

// ── Reorder Paragraphs ────────────────────────────────────────────────────
function ExamReorder({ question, value, onChange }: {
  question: Question;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const allOptions: { label: string; text: string }[] = question.options || [];
  const placedLabels: string[] = value;
  const sourceParagraphs = allOptions.filter((o) => !placedLabels.includes(o.label));
  const targetParagraphs = placedLabels.map((l) => allOptions.find((o) => o.label === l)).filter(Boolean) as typeof allOptions;

  const moveToTarget = (item: typeof allOptions[0]) => {
    onChange([...placedLabels, item.label]);
  };

  const moveToSource = (item: typeof allOptions[0]) => {
    onChange(placedLabels.filter((l) => l !== item.label));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div>
          <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Source</p>
          <div className="space-y-2 min-h-36 border-2 border-dashed border-gray-200 rounded-xl p-2 sm:p-3">
            {sourceParagraphs.map((item) => (
              <div key={item.label} onClick={() => moveToTarget(item)}
                className="flex gap-2 bg-white border border-gray-200 rounded-lg p-3 sm:p-3.5 cursor-pointer hover:border-brand-yellow hover:bg-brand-yellow-soft transition-all">
                <span className="text-sm font-black text-gray-400 mt-0.5 flex-shrink-0">{item.label}</span>
                <span className="text-gray-800 text-[15px] sm:text-base leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Your answer</p>
          <div className="space-y-2 min-h-36 border-2 border-dashed border-brand-yellow/40 rounded-xl p-2 sm:p-3 bg-brand-yellow-soft/30">
            {targetParagraphs.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-400 text-base">+ Click to add</div>
            )}
            {targetParagraphs.map((item, idx) => (
              <div key={item.label} onClick={() => moveToSource(item)}
                className="flex gap-2 bg-white border border-brand-yellow rounded-lg p-3 sm:p-3.5 cursor-pointer hover:bg-brand-yellow-light transition-all">
                <span className="text-sm font-black text-brand-orange mt-0.5 flex-shrink-0">{idx + 1}.</span>
                <span className="text-gray-800 text-[15px] sm:text-base leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fill-in-Blanks (Reading / R&W drag pool) ───────────────────────────────
/** Dùng cùng parser với FillInBlanksReading: đoạn nằm ở `content`, không phải `options`. */
function ExamFIB({ question, value, onChange }: {
  question: Question;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const { segments, wordBank } = parseReadingFibDrag(question);
  const usedWords = Object.values(value);
  const available = wordBank.filter((w) => !usedWords.includes(w));

  const fillBlank = (id: string, word: string) => {
    onChange({ ...value, [id]: word });
  };

  const clearBlank = (id: string) => {
    const next = { ...value };
    delete next[id];
    onChange(next);
  };

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="text-[15px] sm:text-base leading-[2.2] text-gray-800">
        {segments.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
          const id = seg.id;
          const val = value[id];
          return (
            <span key={i} onClick={() => val && clearBlank(id)}
              className={clsx(
                'inline-flex items-center min-w-[110px] mx-1 px-2 py-0.5 border-b-2 rounded cursor-pointer text-sm font-medium transition-colors',
                val ? 'border-brand-yellow bg-brand-yellow-light text-brand-black' : 'border-gray-400 bg-gray-50 text-gray-400'
              )}>
              {val || '\u00A0\u00A0\u00A0\u00A0\u00A0'}
              {val && <span className="ml-1 text-gray-400 text-xs">✕</span>}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
        {available.map((w, wi) => (
          <button
            key={`${w}-${wi}`}
            type="button"
            onClick={() => {
              const firstEmpty = segments.find((s) => s.kind === "blank" && !value[s.id]);
              if (firstEmpty?.kind === "blank") fillBlank(firstEmpty.id, w);
            }}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:border-brand-yellow hover:bg-brand-yellow-soft transition-colors"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Fill-in-Blanks (Listening - type) ────────────────────────────────────
function ExamListeningFIB({ question, value, onChange }: {
  question: Question;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const segments = parseListeningFibSegments(question);
  let blankSeq = 0;

  return (
    <div className="px-5 py-5 space-y-4">
      <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />
      <div className="text-[15px] sm:text-base leading-[2.5] text-gray-800">
        {segments.map((seg, i) => {
          if (!seg.isBlank) return <span key={i}>{seg.text}</span>;
          const id = String(++blankSeq);
          return (
            <input key={i} value={value[id] || ''}
              onChange={(e) => onChange({ ...value, [id]: e.target.value })}
              className="inline-block mx-1 px-2 py-0.5 border-b-2 border-gray-400 focus:border-brand-yellow outline-none bg-transparent text-sm min-w-[100px] text-brand-black font-medium" />
          );
        })}
      </div>
    </div>
  );
}

// ── Highlight Incorrect Words ─────────────────────────────────────────────
function ExamHighlightWords({ question, value, onChange }: {
  question: Question;
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const words = (question.content || '').split(/(\s+)/);

  const toggle = (idx: number, word: string) => {
    if (!word.trim()) return;
    const next = value.includes(idx) ? value.filter((i) => i !== idx) : [...value, idx];
    onChange(next);
  };

  return (
    <div className="px-5 py-5 space-y-4">
      <AudioPlayer src={question.audioUrl} countdownSeconds={5} showSpeedControl />
      <div className="text-sm leading-[2] text-gray-800 bg-gray-50 rounded-xl p-4 border border-gray-200 select-none">
        {words.map((word, idx) => {
          if (!word.trim()) return <span key={idx}>{word}</span>;
          const isH = value.includes(idx);
          return (
            <span key={idx} onClick={() => toggle(idx, word)}
              className={clsx('cursor-pointer rounded px-0.5 transition-colors', isH ? 'bg-brand-yellow text-brand-black' : 'hover:bg-gray-200')}>
              {word}
            </span>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">{value.length} từ được đánh dấu</p>
    </div>
  );
}
