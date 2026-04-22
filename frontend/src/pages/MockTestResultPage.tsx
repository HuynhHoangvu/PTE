import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { mockTestApi } from '../api';
import { Button } from '../components/ui';

const SECTION_CONFIG = [
  { key: 'speaking', label: 'Speaking', icon: '🎙️', color: 'yellow' },
  { key: 'writing',  label: 'Writing',  icon: '✍️',  color: 'orange' },
  { key: 'reading',  label: 'Reading',  icon: '📖',  color: 'black' },
  { key: 'listening',label: 'Listening',icon: '🎧',  color: 'gradient' },
];

// PTE pass mark by component
const PASS_MARK = 65;

function ScoreGauge({ score, max = 90 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const isPassing = score >= PASS_MARK;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={isPassing ? '#F5C518' : '#f97316'}
          strokeWidth="10"
          strokeDasharray={`${2 * Math.PI * 42}`}
          strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-black text-2xl text-gray-900">{Math.round(score)}</span>
        <span className="text-[10px] text-gray-400 font-bold">/ {max}</span>
      </div>
    </div>
  );
}

export default function MockTestResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ['mock-attempt', attemptId],
    queryFn: () => mockTestApi.getAttempt(attemptId!),
    enabled: !!attemptId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="font-bold text-gray-700">Không tìm thấy kết quả</p>
          <Button variant="yellow" className="mt-4" onClick={() => navigate('/mock-test')}>← Về Mock Test</Button>
        </div>
      </div>
    );
  }

  const total = Math.round(attempt.totalScore || 0);
  const isPassing = total >= PASS_MARK;
  const sections = attempt.sectionScores || { speaking: 0, writing: 0, reading: 0, listening: 0 };

  // Time taken
  let timeTaken = '';
  if (attempt.startedAt && attempt.completedAt) {
    const ms = new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    timeTaken = `${mins} phút ${secs} giây`;
  }

  const mockTestTitle = attempt.mockTest?.title || 'Mock Test';

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center">✈️</div>
          <span className="font-display font-black">FlyEdu</span>
        </div>
        <h1 className="font-display font-black text-base">Kết quả thi</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/mock-test')}>← Về danh sách</Button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Pass/Fail Banner */}
        <div className={clsx(
          'rounded-2xl px-7 py-6 flex items-center justify-between',
          isPassing ? 'bg-brand-black' : 'bg-gray-800'
        )}>
          <div>
            <div className={clsx(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black mb-3',
              isPassing ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
            )}>
              {isPassing ? '✓ ĐẠT YÊU CẦU' : '✗ CHƯA ĐẠT'}
            </div>
            <h2 className="font-display font-black text-2xl text-white mb-1">{mockTestTitle}</h2>
            <p className="text-sm text-gray-400">
              {isPassing
                ? 'Chúc mừng! Bạn đã đạt điểm chuẩn PTE Academic.'
                : `Cần ${PASS_MARK} điểm để đạt. Hãy luyện thêm và thử lại!`}
            </p>
            {timeTaken && (
              <p className="text-xs text-gray-500 mt-2">⏱ Thời gian làm bài: {timeTaken}</p>
            )}
          </div>
          <ScoreGauge score={total} />
        </div>

        {/* Section Scores */}
        <div className="card p-6">
          <h3 className="font-display font-black text-base mb-5">Điểm theo kỹ năng</h3>
          <div className="space-y-5">
            {SECTION_CONFIG.map(({ key, label, icon, color }) => {
              const score = Math.round(sections[key as keyof typeof sections] || 0);
              const pct = Math.round((score / 90) * 100);
              const pass = score >= PASS_MARK;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-sm font-bold text-gray-800">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'text-[10px] font-black px-2 py-0.5 rounded',
                        pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      )}>
                        {pass ? '✓ Đạt' : '✗ Chưa đạt'}
                      </span>
                      <span className="font-display font-black text-lg text-gray-900">{score}<span className="text-xs text-gray-400 font-normal">/90</span></span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-700',
                        color === 'yellow' ? 'bg-brand-yellow' :
                        color === 'orange' ? 'bg-brand-orange' :
                        color === 'black' ? 'bg-brand-black' :
                        'bg-gradient-to-r from-brand-yellow to-brand-orange'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                    <span className="text-[10px] text-gray-400">Mục tiêu: {PASS_MARK}/90</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score breakdown summary */}
        <div className="grid grid-cols-2 gap-4">
          {SECTION_CONFIG.map(({ key, label, icon }) => {
            const score = Math.round(sections[key as keyof typeof sections] || 0);
            return (
              <div key={key} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-yellow-light rounded-xl flex items-center justify-center text-xl">{icon}</div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold">{label}</p>
                  <p className="font-display font-black text-xl text-gray-900">{score}<span className="text-xs text-gray-400 font-normal">/90</span></p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="yellow"
            className="flex-1 py-3"
            onClick={() => navigate(`/mock-test/${attempt.mockTestId}`)}
          >
            🔄 Thi lại
          </Button>
          <Button
            variant="dark"
            className="flex-1 py-3"
            onClick={() => navigate('/mock-test')}
          >
            📋 Xem danh sách đề thi
          </Button>
          <Button
            variant="ghost"
            className="flex-1 py-3"
            onClick={() => navigate('/dashboard')}
          >
            🏠 Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
