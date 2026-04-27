import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Mic2, PenLine, BookOpen, Headphones,
  Flame, Target, Trophy,
  ClipboardList, CheckCircle2, Clock, ChevronRight,
  Zap, TrendingUp, Plane, Sparkles,
} from 'lucide-react';
import { usersApi, mockTestApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, ProgressBar } from '../components/ui';
import { QuestionSkill, SKILL_TYPES, QUESTION_TYPE_LABELS, QuestionType } from '../types';
import { clsx } from 'clsx';
import { LUX } from '../theme/luxuryPalette';

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
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-800',
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
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-8 h-14
                        flex items-center justify-between sticky top-14 z-20 motion-safe:animate-fade-in-down">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="font-display font-black text-base sm:text-lg text-brand-black">Question Bank</h1>
            <span className="text-xs font-bold px-2 sm:px-2.5 py-1 rounded-lg bg-brand-gold-light text-brand-gold hidden sm:inline">
              FLY ACADEMY
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>
              <Plane size={13} /><span className="hidden sm:inline">Thi thử ngay</span>
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ── Bento top: hero (wide) + score / streak (stack) — desktop ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-2 gap-4">
            <div
              className="lg:col-span-8 lg:row-span-2 rounded-3xl px-6 py-8 sm:px-8 sm:py-9
                         flex flex-col justify-center min-h-[200px] lg:min-h-[220px]
                         overflow-hidden relative border border-amber-400/15 shadow-xl motion-safe:animate-fade-in-up"
              style={{ background: `linear-gradient(180deg, ${LUX.charcoal} 0%, ${LUX.charcoalDeep} 100%)` }}
            >
              {/* Viền vàng mỏng + highlight tĩnh — tránh blur làm nền nhạt/mờ */}
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-90"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(253,213,47,0.07) 0%, transparent 42%, transparent 58%, rgba(253,213,47,0.04) 100%)',
                }}
              />
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                   style={{ backgroundImage: `radial-gradient(circle, ${LUX.goldBright} 1px, transparent 1px)`, backgroundSize: '22px 22px' }} />

              <div className="relative z-10 max-w-xl">
                <p className="text-sm text-stone-200/95 mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-gold-bright motion-safe:animate-float" />
                  {greet()}, {firstName}
                </p>
                <h2 className="font-display font-black text-2xl sm:text-3xl text-white mb-4 leading-tight tracking-tight">
                  Hôm nay ôn luyện{' '}
                  <span className="text-gold-gradient-animate">FLY Academic</span>
                  <br className="hidden sm:block" />
                  <span className="text-stone-100/90 text-xl sm:text-2xl font-extrabold"> — sẵn sàng chưa?</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5 text-stone-200/90">
                    <Target size={13} className="text-brand-gold-bright shrink-0" />
                    Mục tiêu <span className="text-white font-bold">79+</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-stone-200/90">
                    <BookOpen size={13} className="text-brand-gold-bright shrink-0" />
                    Hôm nay <span className="text-white font-bold">0/20 câu</span>
                  </span>
                </div>
              </div>
            </div>

            <div
              className="lg:col-span-4 lg:col-start-9 lg:row-start-1 rounded-3xl px-5 py-5 sm:px-6
                         flex flex-col justify-center text-center ring-1 ring-amber-200/60
                         bg-white/95 backdrop-blur-md shadow-lg motion-safe:animate-fade-in-up motion-safe:delay-75"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Điểm TB AI</p>
              <p className="font-display font-black text-4xl sm:text-5xl text-brand-gold leading-none tabular-nums">
                {Math.round(stats?.avgScore || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-2 font-semibold">/ 90 · Mục tiêu 79+</p>
            </div>

            <div
              className="lg:col-span-4 lg:col-start-9 lg:row-start-2 rounded-3xl px-5 py-5
                         flex items-center justify-center gap-4 ring-1 ring-amber-300/40
                         text-white shadow-lg motion-safe:animate-fade-in-up motion-safe:delay-150"
            style={{
              background: `linear-gradient(135deg, ${LUX.gold} 0%, ${LUX.goldBright} 55%, ${LUX.cream} 100%)`,
            }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Flame size={24} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Streak</p>
                <p className="font-display font-black text-3xl leading-none tabular-nums">
                  {stats?.streakDays || 0}
                </p>
                <p className="text-xs font-bold text-white/90 mt-0.5">ngày liên tiếp</p>
              </div>
            </div>
          </div>

          {/* ── Stats: bento nhỏ (2×2 mobile, 4 cột desktop) ─ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {STAT_CARDS(stats, mockTests || [], mockHistory || []).map((s, i) => (
              <div
                key={s.label}
                className={clsx(
                  'rounded-3xl border border-gray-100/80 bg-white/90 backdrop-blur-sm p-4 sm:p-5',
                  'shadow-sm hover:shadow-md hover:border-amber-200/70 hover:-translate-y-0.5 transition-all duration-200',
                  'motion-safe:animate-fade-in-up',
                  i === 0 && 'lg:ring-1 lg:ring-amber-100/90',
                )}
                style={{ animationDelay: `${220 + i * 55}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', s.iconBg)}>
                    <s.icon size={20} className={s.iconColor} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wide">{s.label}</p>
                    <p className="font-display font-black text-lg sm:text-xl text-gray-900 leading-tight mt-0.5 truncate">{s.value}</p>
                    <p className="text-[10px] sm:text-[11px] text-amber-800/90 font-bold mt-1 line-clamp-2">{s.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Skill Sections ────────────────────────────────────── */}
          {SKILL_CONFIG.map((skill, si) => {
            const types      = SKILL_TYPES[skill.key];
            const skillStats = stats?.skillStats?.[skill.key] || { count: 0, avgScore: 0 };
            const avgScore   = Math.round(skillStats.avgScore || 0);
            const attempted  = skillStats.count || 0;

            const accentColors: Record<string, string> = {
              gold:     'bg-brand-gold',
              orange:   'bg-amber-600',
              dark:     'bg-brand-charcoal',
              gradient: 'bg-gradient-to-r from-brand-gold to-brand-gold-bright',
            };
            const iconBgColors: Record<string, string> = {
              gold:     'bg-brand-gold-light text-brand-gold',
              orange:   'bg-amber-50 text-amber-900',
              dark:     'bg-stone-200 text-brand-charcoal',
              gradient: 'bg-brand-gold-soft text-brand-gold',
            };

            return (
              <div
                key={skill.key}
                className="motion-safe:animate-fade-in-up"
                style={{ animationDelay: `${480 + si * 70}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-black text-base flex items-center gap-2 text-brand-black">
                    <skill.icon size={16} className="text-brand-gold" strokeWidth={2.5} />
                    {skill.label}
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                      {types.length} dạng
                    </span>
                    {attempted > 0 && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg">
                        TB: {avgScore}/90
                      </span>
                    )}
                  </h2>
                  <button onClick={() => navigate(skill.path)}
                          className="text-sm font-bold text-brand-gold hover:underline flex items-center gap-1">
                    Xem tất cả <ChevronRight size={14} />
                  </button>
                </div>

                <div className={clsx('grid gap-3', types.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
                  {types.slice(0, 4).map((type, i) => {
                    const colorKeys = ['gold', 'orange', 'dark', 'gradient'];
                    const c = colorKeys[i % colorKeys.length];
                    return (
                      <div key={type} onClick={() => navigate(skill.path)}
                           className="card p-4 cursor-pointer hover:-translate-y-1 hover:shadow-gold-sm
                                      hover:border-brand-gold/30 transition-all duration-200 relative overflow-hidden
                                      motion-safe:animate-fade-in-up"
                           style={{ animationDelay: `${520 + si * 70 + i * 45}ms` }}
                      >
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
                       className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-50
                                  hover:bg-brand-gold-soft/60 cursor-pointer transition-colors"
                       onClick={() => navigate(`/mock-test/${mt.id}`)}>
                    {/* Number badge */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                         style={{
                           background: `linear-gradient(135deg, ${LUX.goldPale}40, ${LUX.cream}70)`,
                           border: `1px solid rgba(228,168,8,0.35)`,
                         }}>
                      <span className="text-[7px] font-black text-brand-gold uppercase">TEST</span>
                      <span className="font-display font-black text-sm text-brand-gold leading-none">
                        {mt.code?.replace(/\D/g, '').slice(-2)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{mt.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Clock size={10} /> {mt.durationMinutes} phút</span>
                        <span className="hidden sm:inline">Cập nhật {mt.updatedYear}</span>
                      </p>
                    </div>

                    {/* Status — hidden on xs */}
                    <span className={clsx('hidden sm:flex text-[10px] font-black px-2.5 py-1 rounded-lg items-center gap-1',
                      status === 'done'     ? 'bg-amber-100 text-amber-900' :
                      status === 'progress' ? 'bg-amber-100 text-amber-700' :
                                              'bg-gray-100 text-gray-500'
                    )}>
                      {status === 'done'     ? <><CheckCircle2 size={10} /> Hoàn thành</> :
                       status === 'progress' ? <><Clock size={10} /> Đang làm</> :
                                              'Chưa làm'}
                    </span>

                    <Button variant="dark" size="sm" className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-4">
                      {status === 'done' ? 'Xem lại' : status === 'progress' ? 'Tiếp tục' : 'Luyện'}
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
