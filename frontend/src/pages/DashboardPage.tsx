import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Mic2, PenLine, BookOpen, Headphones,
  Flame, Target, Trophy, BarChart2,
  ClipboardList, CheckCircle2, Clock, ChevronRight,
  Zap, TrendingUp, Plane, Sparkles,
} from 'lucide-react';
import { usersApi, mockTestApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, ProgressBar } from '../components/ui';
import { QuestionSkill, SKILL_TYPES, QUESTION_TYPE_LABELS, QuestionType } from '../types';
import { clsx } from 'clsx';

const SKILL_CONFIG = [
  { key: 'SPEAKING'  as QuestionSkill, icon: Mic2,       label: 'Speaking',  path: '/practice/speaking',  color: 'gold'     },
  { key: 'WRITING'   as QuestionSkill, icon: PenLine,    label: 'Writing',   path: '/practice/writing',   color: 'orange'   },
  { key: 'READING'   as QuestionSkill, icon: BookOpen,   label: 'Reading',   path: '/practice/reading',   color: 'dark'     },
  { key: 'LISTENING' as QuestionSkill, icon: Headphones, label: 'Listening', path: '/practice/listening', color: 'gradient' },
];

const STAT_CARDS = (stats: any, mockTests: any[], mockHistory: any[]) => [
  {
    label:  'Câu đã làm',
    value:  stats?.totalAttempts || 0,
    sub:    '+48 tuần này',
    icon:   Zap,
    iconBg: 'bg-brand-gold-light',
    iconColor: 'text-brand-gold',
  },
  {
    label:  'Điểm TB AI',
    value:  `${Math.round(stats?.avgScore || 0)}/90`,
    sub:    '+4pt so tháng trước',
    icon:   TrendingUp,
    iconBg: 'bg-orange-50',
    iconColor: 'text-brand-orange',
  },
  {
    label:  'Streak',
    value:  `${stats?.streakDays || 0} ngày`,
    sub:    'Kỷ lục: 18 ngày',
    icon:   Flame,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
  {
    label:  'Mock Test',
    value:  `${mockHistory?.filter((h: any) => h.status === 'COMPLETED').length || 0}/${mockTests?.length || 0}`,
    sub:    'Đã hoàn thành',
    icon:   Trophy,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
];

export default function DashboardPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  const { data: stats }       = useQuery({ queryKey: ['stats'],       queryFn: usersApi.getStats });
  const { data: mockTests }   = useQuery({ queryKey: ['mockTests'],   queryFn: mockTestApi.list });
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

  const firstName = user?.fullName?.split(' ').pop() || 'bạn';

  return (
    <MainLayout>
      <div className="min-h-screen bg-brand-cream">

        {/* ── Topbar ───────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-100 px-8 h-14
                        flex items-center justify-between sticky top-14 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-lg text-brand-black">Question Bank</h1>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-gold-light text-brand-gold">
              FLY ACADEMY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => {}}>
              <BarChart2 size={13} /> Báo cáo
            </Button>
            <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>
              <Plane size={13} /> Thi thử ngay
            </Button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* ── Hero Banner ──────────────────────────────────────── */}
          <div className="rounded-2xl px-7 py-7 flex items-center justify-between
                          overflow-hidden relative"
               style={{ background: 'linear-gradient(135deg, #0A0A12 0%, #1A1A28 60%, #12121C 100%)' }}>
            {/* Decorative orbs */}
            <div className="absolute right-0 top-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                 style={{ background: 'rgba(200,149,42,0.12)' }} />
            <div className="absolute right-56 bottom-0 w-40 h-40 rounded-full blur-2xl translate-y-1/2"
                 style={{ background: 'rgba(200,149,42,0.08)' }} />
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                 style={{ backgroundImage: 'radial-gradient(circle, #C8952A 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Left content */}
            <div className="relative z-10">
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand-gold" />
                {greet()}, {firstName}
              </p>
              <h2 className="font-display font-black text-2xl text-white mb-3 leading-snug">
                Hôm nay ôn luyện<br />
                <span className="text-gold-gradient-animate">PTE Academic</span> nào!
              </h2>
              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Target size={13} className="text-brand-gold" />
                  Mục tiêu: <span className="text-brand-gold font-bold ml-1">79+</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <BookOpen size={13} className="text-brand-gold" />
                  Hôm nay: <span className="text-brand-gold font-bold ml-1">0/20 câu</span>
                </span>
              </div>
            </div>

            {/* Right score + streak */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="rounded-2xl px-6 py-4 text-center border"
                   style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(200,149,42,0.25)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Điểm hiện tại</p>
                <p className="font-display font-black text-3xl text-brand-gold leading-none">
                  {Math.round(stats?.avgScore || 0)}
                </p>
                <p className="text-[9px] text-gray-600 mt-1">Mục tiêu: 79+</p>
              </div>
              <div className="rounded-2xl px-4 py-4 text-center"
                   style={{ background: 'linear-gradient(135deg, #C8952A, #E8B84B)' }}>
                <Flame size={20} className="text-white mx-auto mb-1" />
                <p className="font-display font-black text-2xl text-white leading-none">
                  {stats?.streakDays || 0}
                </p>
                <p className="text-[9px] text-amber-100 font-bold">ngày liên tiếp</p>
              </div>
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {STAT_CARDS(stats, mockTests || [], mockHistory || []).map((s) => (
              <div key={s.label} className="stat-card">
                <div className={clsx('stat-icon', s.iconBg)}>
                  <s.icon size={20} className={s.iconColor} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold">{s.label}</p>
                  <p className="font-display font-black text-xl text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[11px] text-green-500 font-bold mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Skill Sections ────────────────────────────────────── */}
          {SKILL_CONFIG.map((skill) => {
            const types      = SKILL_TYPES[skill.key];
            const skillStats = stats?.skillStats?.[skill.key] || { count: 0, avgScore: 0 };
            const avgScore   = Math.round(skillStats.avgScore || 0);
            const attempted  = skillStats.count || 0;

            const accentColors: Record<string, string> = {
              gold:     'bg-brand-gold',
              orange:   'bg-brand-orange',
              dark:     'bg-brand-black',
              gradient: 'bg-gradient-to-r from-brand-gold to-brand-orange',
            };
            const iconBgColors: Record<string, string> = {
              gold:     'bg-brand-gold-light text-brand-gold',
              orange:   'bg-orange-50 text-brand-orange',
              dark:     'bg-gray-100 text-brand-black',
              gradient: 'bg-amber-50 text-brand-gold',
            };

            return (
              <div key={skill.key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-black text-base flex items-center gap-2 text-brand-black">
                    <skill.icon size={16} className="text-brand-gold" strokeWidth={2.5} />
                    {skill.label}
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                      {types.length} dạng
                    </span>
                    {attempted > 0 && (
                      <span className="text-xs font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-lg">
                        TB: {avgScore}/90
                      </span>
                    )}
                  </h2>
                  <button onClick={() => navigate(skill.path)}
                          className="text-sm font-bold text-brand-gold hover:underline flex items-center gap-1">
                    Xem tất cả <ChevronRight size={14} />
                  </button>
                </div>

                <div className={clsx('grid gap-3', types.length <= 2 ? 'grid-cols-2' : 'grid-cols-4')}>
                  {types.slice(0, 4).map((type, i) => {
                    const colorKeys = ['gold', 'orange', 'dark', 'gradient'];
                    const c = colorKeys[i % colorKeys.length];
                    return (
                      <div key={type} onClick={() => navigate(skill.path)}
                           className="card p-4 cursor-pointer hover:-translate-y-1 hover:shadow-gold-sm
                                      hover:border-brand-gold/30 transition-all duration-200 relative overflow-hidden">
                        {/* Top accent bar */}
                        <div className={clsx('absolute top-0 left-0 right-0 h-[3px]', accentColors[c])} />
                        <div className="mt-1 mb-3 flex items-start justify-between">
                          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', iconBgColors[c])}>
                            <skill.icon size={16} strokeWidth={2} />
                          </div>
                          <span className="tag-ai">AI CHẤM</span>
                        </div>
                        <p className="font-display font-black text-sm text-gray-900 mb-2 leading-snug">
                          {QUESTION_TYPE_LABELS[type as QuestionType]}
                        </p>
                        <ProgressBar value={avgScore} max={90} color={c === 'gold' ? 'yellow' : c} />
                        <div className="flex justify-between mt-2 items-center">
                          <span className="text-[10px] text-gray-400">
                            {attempted > 0 ? `${attempted} câu đã làm` : 'Chưa luyện'}
                          </span>
                          <span className="text-[11px] font-black text-brand-gold flex items-center gap-0.5">
                            {attempted > 0 ? 'Tiếp tục' : 'Bắt đầu'}
                            <ChevronRight size={11} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Mock Test Library ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-base flex items-center gap-2 text-brand-black">
                <ClipboardList size={16} className="text-brand-gold" strokeWidth={2.5} />
                Mock Test Library
              </h2>
              <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>
                Xem tất cả
              </Button>
            </div>

            <div className="card overflow-hidden">
              {(mockTests || []).slice(0, 5).map((mt: any) => {
                const status = getStatusForTest(mt.id);
                return (
                  <div key={mt.id}
                       className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50
                                  hover:bg-brand-gold-soft/60 cursor-pointer transition-colors"
                       onClick={() => navigate(`/mock-test/${mt.id}`)}>
                    {/* Number badge */}
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #FFF4D6, #FFFBEC)', border: '1px solid rgba(200,149,42,0.20)' }}>
                      <span className="text-[7px] font-black text-brand-gold uppercase">TEST</span>
                      <span className="font-display font-black text-sm text-brand-gold leading-none">
                        {mt.code?.replace(/\D/g, '').slice(-2)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{mt.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Clock size={10} /> {mt.durationMinutes} phút</span>
                        <span>Cập nhật {mt.updatedYear}</span>
                      </p>
                    </div>

                    {/* Status */}
                    <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1',
                      status === 'done'     ? 'bg-green-100 text-green-700' :
                      status === 'progress' ? 'bg-amber-100 text-amber-700' :
                                              'bg-gray-100 text-gray-500'
                    )}>
                      {status === 'done'     ? <><CheckCircle2 size={10} /> Hoàn thành</> :
                       status === 'progress' ? <><Clock size={10} /> Đang làm</> :
                                              'Chưa làm'}
                    </span>

                    <Button variant="dark" size="sm">
                      {status === 'done' ? 'Xem lại' : status === 'progress' ? 'Tiếp tục' : 'Luyện ngay'}
                    </Button>
                  </div>
                );
              })}

              {(!mockTests || mockTests.length === 0) && (
                <div className="py-12 text-center text-gray-400">
                  <ClipboardList size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Chưa có mock test nào</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
