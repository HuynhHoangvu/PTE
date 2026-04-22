import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi, mockTestApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, Badge, ProgressBar } from '../components/ui';
import { QuestionSkill, SKILL_TYPES, QUESTION_TYPE_LABELS, QuestionType } from '../types';
import { clsx } from 'clsx';

const SKILL_CONFIG = [
  { key: 'SPEAKING' as QuestionSkill, icon: '🎙️', label: 'Speaking', path: '/practice/speaking', color: 'yellow' },
  { key: 'WRITING' as QuestionSkill, icon: '✍️', label: 'Writing', path: '/practice/writing', color: 'orange' },
  { key: 'READING' as QuestionSkill, icon: '📖', label: 'Reading', path: '/practice/reading', color: 'black' },
  { key: 'LISTENING' as QuestionSkill, icon: '🎧', label: 'Listening', path: '/practice/listening', color: 'gradient' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: usersApi.getStats });
  const { data: mockTests } = useQuery({ queryKey: ['mockTests'], queryFn: mockTestApi.list });
  const { data: mockHistory } = useQuery({ queryKey: ['mockHistory'], queryFn: mockTestApi.getHistory });

  const getStatusForTest = (id: string) => {
    if (!mockHistory) return 'todo';
    const h = mockHistory.find((h: any) => h.mockTestId === id);
    if (!h) return 'todo';
    return h.status === 'COMPLETED' ? 'done' : 'progress';
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F7F6F3]">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-lg">Question Bank</h1>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button className="px-2.5 py-1.5 bg-brand-yellow text-sm">⊞</button>
              <button className="px-2.5 py-1.5 hover:bg-gray-50 text-sm text-gray-400">≡</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">📊 Báo cáo</Button>
            <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>✈️ Thi thử ngay</Button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Hero Banner */}
          <div className="bg-brand-black rounded-2xl px-7 py-6 flex items-center justify-between overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-64 bg-brand-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute right-48 bottom-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-2xl translate-y-1/2" />
            <div className="relative z-10">
              <p className="text-sm text-gray-400 mb-1">{greet()}, {user?.fullName?.split(' ').pop() || 'bạn'} 👋</p>
              <h2 className="font-display font-black text-2xl text-white mb-3 leading-snug">
                Hôm nay ôn luyện<br /><span className="text-brand-yellow">PTE Academic</span> nào!
              </h2>
              <div className="flex items-center gap-5 text-sm">
                <span className="text-gray-400">🎯 Mục tiêu: <span className="text-brand-yellow font-bold">79+</span></span>
                <span className="text-gray-400">📚 Hôm nay: <span className="text-brand-yellow font-bold">0/20 câu</span></span>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="bg-brand-dark2 rounded-xl px-5 py-4 text-center border border-brand-dark">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Điểm hiện tại</p>
                <p className="font-display font-black text-3xl text-brand-yellow leading-none">{Math.round(stats?.avgScore || 0)}</p>
                <p className="text-[9px] text-gray-600 mt-1">Mục tiêu: 79+</p>
              </div>
              <div className="bg-brand-orange rounded-xl px-4 py-4 text-center">
                <p className="text-2xl">🔥</p>
                <p className="font-display font-black text-2xl text-white leading-none">{stats?.streakDays || 0}</p>
                <p className="text-[9px] text-orange-200 font-bold">ngày liên tiếp</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Câu đã làm', value: stats?.totalAttempts || 0, icon: '📝', sub: '+48 tuần này', color: 'yellow' },
              { label: 'Điểm TB AI', value: `${Math.round(stats?.avgScore || 0)}/90`, icon: '🤖', sub: '+4pt so tháng trước', color: 'orange' },
              { label: 'Streak', value: `${stats?.streakDays || 0} ngày`, icon: '🔥', sub: 'Kỷ lục: 18', color: 'yellow' },
              { label: 'Mock Test', value: `${mockHistory?.filter((h: any) => h.status === 'COMPLETED').length || 0}/${mockTests?.length || 0}`, icon: '✅', sub: 'Đã hoàn thành', color: 'green' },
            ].map((s) => (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                  s.color === 'yellow' ? 'bg-brand-yellow-light' :
                  s.color === 'orange' ? 'bg-brand-orange-light' : 'bg-green-50'
                )}>{s.icon}</div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold">{s.label}</p>
                  <p className="font-display font-black text-xl text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[11px] text-green-500 font-bold mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {SKILL_CONFIG.map((skill) => {
            const types = SKILL_TYPES[skill.key];
            const skillStats = stats?.skillStats?.[skill.key] || { count: 0, avgScore: 0 };
            const avgScore = Math.round(skillStats.avgScore || 0);
            const attemptCount = skillStats.count || 0;
            return (
              <div key={skill.key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-black text-base flex items-center gap-2">
                    {skill.icon} {skill.label}
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{types.length} dạng</span>
                    {attemptCount > 0 && (
                      <span className="text-xs font-bold text-brand-orange bg-brand-orange-light px-2 py-0.5 rounded-lg">
                        TB: {avgScore}/90
                      </span>
                    )}
                  </h2>
                  <button onClick={() => navigate(skill.path)} className="text-sm font-bold text-brand-orange hover:underline">Xem tất cả →</button>
                </div>
                <div className={clsx('grid gap-3', types.length <= 2 ? 'grid-cols-2' : 'grid-cols-4')}>
                  {types.slice(0, 4).map((type, i) => {
                    const colors = ['yellow', 'orange', 'black', 'gradient'];
                    const c = colors[i % colors.length];
                    return (
                      <div key={type} onClick={() => navigate(skill.path)}
                        className="card p-4 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-brand-yellow transition-all duration-200 relative overflow-hidden">
                        <div className={clsx('absolute top-0 left-0 right-0 h-[3px]',
                          c === 'yellow' ? 'bg-brand-yellow' : c === 'orange' ? 'bg-brand-orange' :
                          c === 'black' ? 'bg-brand-black' : 'bg-gradient-to-r from-brand-yellow to-brand-orange'
                        )} />
                        <div className="mt-1 mb-3 flex items-start justify-between">
                          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center text-lg',
                            c === 'yellow' ? 'bg-brand-yellow-light' : c === 'orange' ? 'bg-brand-orange-light' : 'bg-gray-100'
                          )}>📌</div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="tag-ai">AI CHẤM</span>
                          </div>
                        </div>
                        <p className="font-display font-black text-sm text-gray-900 mb-2 leading-snug">{QUESTION_TYPE_LABELS[type]}</p>
                        <ProgressBar value={avgScore} max={90} color={c} />
                        <div className="flex justify-between mt-2 items-center">
                          <span className="text-[10px] text-gray-400">
                            {attemptCount > 0 ? `${attemptCount} câu đã làm` : 'Chưa luyện'}
                          </span>
                          <span className="text-[11px] font-black text-brand-orange">
                            {attemptCount > 0 ? 'Tiếp tục →' : 'Bắt đầu →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Mock Tests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-base flex items-center gap-2">🎯 Mock Test Library</h2>
              <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>Xem tất cả</Button>
            </div>
            <div className="card overflow-hidden">
              {(mockTests || []).slice(0, 5).map((mt: any) => {
                const status = getStatusForTest(mt.id);
                return (
                  <div key={mt.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-brand-yellow-soft/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/mock-test/${mt.id}`)}>
                    <div className="w-10 h-10 bg-brand-yellow-light rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[7px] font-black text-brand-yellow-deep uppercase">TEST</span>
                      <span className="font-display font-black text-sm text-brand-black leading-none">{mt.code?.replace(/\D/g, '').slice(-2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{mt.title}</p>
                      <p className="text-xs text-gray-400">⏱ {mt.durationMinutes} phút · Cập nhật {mt.updatedYear}</p>
                    </div>
                    <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-lg',
                      status === 'done' ? 'bg-green-100 text-green-700' :
                      status === 'progress' ? 'bg-orange-100 text-brand-orange-deep' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {status === 'done' ? '✓ Hoàn thành' : status === 'progress' ? '⏳ Đang làm' : 'Chưa làm'}
                    </span>
                    <Button variant="dark" size="sm">
                      {status === 'done' ? 'Xem lại' : status === 'progress' ? 'Tiếp tục' : 'Luyện ngay'}
                    </Button>
                  </div>
                );
              })}
              {(!mockTests || mockTests.length === 0) && (
                <div className="py-12 text-center text-gray-400"><p className="text-2xl mb-2">📝</p><p>Chưa có mock test</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
