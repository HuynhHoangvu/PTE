import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usersApi, mockTestApi } from "../../api";
import { logoUrl } from "../../assets";
import { useAuthStore } from "../../stores/authStore";
import { QuestionSkill, SKILL_TYPES } from "../../types";
import { MobileHeader } from "../layout/MobileShell";
import { MBadge, MSkeleton, MSkeletonCard, MErrorState } from "../ui";
import { useUserGoals } from "./MOnboardingGate";
import { clsx } from "clsx";

const SKILLS: {
  key: QuestionSkill;
  label: string;
  icon: string;
  accent: string;
  bg: string;
}[] = [
  { key: "SPEAKING", label: "Speaking", icon: "🎙️", accent: "#f59e0b", bg: "bg-amber-50" },
  { key: "WRITING",  label: "Writing",  icon: "✍️",  accent: "#3b82f6", bg: "bg-blue-50"  },
  { key: "READING",  label: "Reading",  icon: "📖",  accent: "#22c55e", bg: "bg-green-50" },
  { key: "LISTENING",label: "Listening",icon: "🎧",  accent: "#a855f7", bg: "bg-purple-50"},
];

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return d > 0 ? d : null;
}

// ── Circular Progress SVG ─────────────────────────────────────────────────────
function CircularProgress({
  value, max, size = 120, stroke = 10, label, sublabel, color = "#f59e0b"
}: {
  value: number; max: number; size?: number; stroke?: number;
  label?: string; sublabel?: string; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ - pct * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display font-black text-xl text-white leading-none">{Math.round(value)}</p>
        {label && <p className="text-[9px] text-white/60 font-bold mt-0.5 leading-none">{label}</p>}
        {sublabel && <p className="text-[8px] text-white/40 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Streak Flame ──────────────────────────────────────────────────────────────
function StreakBadge({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/30 rounded-2xl px-3 py-1.5">
      <span className="text-base">🔥</span>
      <div>
        <p className="font-display font-black text-sm text-orange-300 leading-none">{days}</p>
        <p className="text-[8px] text-orange-400/70 leading-none">ngày</p>
      </div>
    </div>
  );
}

export default function MDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { targetScore, examDate } = useUserGoals();
  const firstName = user?.fullName?.split(" ").pop() || "bạn";
  const targetNum = parseInt(targetScore) || 79;
  const daysLeft = daysUntil(examDate);

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["stats"],
    queryFn: usersApi.getStats,
  });
  const { data: mockTests } = useQuery({
    queryKey: ["mockTests"],
    queryFn: mockTestApi.list,
  });
  const { data: mockHistory } = useQuery({
    queryKey: ["mockHistory"],
    queryFn: mockTestApi.getHistory,
  });

  const avgScore = Math.round(stats?.avgScore || 0);
  const streak = stats?.streakDays || 0;
  const totalAttempts = stats?.totalAttempts || 0;
  const completedMockCount = (mockHistory || []).filter((h: any) => h.status === "COMPLETED").length;

  return (
    <>
      {/* ── Header ── */}
      <MobileHeader
        title={<img src={logoUrl} alt="FLY Academy" className="h-7 w-auto" />}
      />

      <div className="px-4 space-y-4 pb-6">

        {/* ── Hero Card ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
        >
          {/* Greeting bar */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50 font-medium">{greet()}</p>
              <p className="font-display font-black text-base text-white">{firstName} 👋</p>
            </div>
            {streak > 0 && <StreakBadge days={streak} />}
          </div>

          {/* Progress + Countdown row */}
          <div className="px-5 pb-5 flex items-center gap-4">
            {/* Circular progress */}
            <CircularProgress
              value={avgScore}
              max={targetNum}
              size={112}
              stroke={9}
              label={`/ ${targetNum}`}
              sublabel="mục tiêu"
              color="#f59e0b"
            />

            {/* Stats column */}
            <div className="flex-1 space-y-3">
              {daysLeft !== null && (
                <div className="bg-white/5 rounded-2xl px-3 py-2.5">
                  <p className="font-display font-black text-2xl text-white leading-none">{daysLeft}</p>
                  <p className="text-[10px] text-white/50 font-medium mt-0.5">ngày đến kỳ thi 📅</p>
                  <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gold rounded-full"
                      style={{ width: `${Math.max(5, Math.min(100, (1 - daysLeft / 180) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center">
                  <p className="font-display font-black text-lg text-white leading-none">{totalAttempts}</p>
                  <p className="text-[9px] text-white/40 mt-0.5">Đã làm</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center">
                  <p className="font-display font-black text-lg text-brand-gold leading-none">{completedMockCount}</p>
                  <p className="text-[9px] text-white/40 mt-0.5">Mock test</p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Learning strip */}
          <button
            onClick={() => navigate("/practice/speaking")}
            className="w-full border-t border-white/10 px-5 py-3 flex items-center gap-3 active:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base">▶️</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Tiếp tục học</p>
              <p className="text-sm font-bold text-white">Luyện Speaking hôm nay</p>
            </div>
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: "⏱️", label: "Thi thử", sub: `${completedMockCount} xong`, path: "/mock-test", bg: "bg-amber-50" },
            { icon: "📊", label: "Phân tích", sub: "Điểm yếu", path: "/analytics", bg: "bg-blue-50" },
            { icon: "🔖", label: "Đã lưu", sub: "Câu khó", path: "/bookmarks", bg: "bg-green-50" },
          ].map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:scale-[0.97] transition-transform"
            >
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5", a.bg)}>
                <span className="text-xl">{a.icon}</span>
              </div>
              <p className="font-bold text-[11px] text-gray-900">{a.label}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{a.sub}</p>
            </button>
          ))}
        </div>

        {/* ── Skills ── */}
        <div>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Kỹ năng luyện tập</p>
          <div className="space-y-2.5">
            {SKILLS.map((skill) => {
              const types = SKILL_TYPES[skill.key] || [];
              const skillStats = stats?.skillStats?.[skill.key] || { count: 0, avgScore: 0 };
              const avg = Math.round(skillStats.avgScore || 0);
              const count = skillStats.count || 0;
              const pct = Math.min((avg / 90) * 100, 100);

              return (
                <button
                  key={skill.key}
                  onClick={() => navigate(`/practice/${skill.key.toLowerCase()}`)}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform text-left shadow-sm border border-gray-100"
                >
                  <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0", skill.bg)}>
                    {skill.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-bold text-sm text-gray-900">{skill.label}</p>
                      <div className="flex items-center gap-2">
                        {count > 0 ? (
                          <span className="text-xs font-black" style={{ color: skill.accent }}>{avg}/90</span>
                        ) : null}
                        <span className="text-[10px] text-gray-400">{types.length} dạng</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: skill.accent }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {count > 0 ? `${count} câu đã luyện` : "Chưa luyện · Bắt đầu ngay"}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Recent Mock Tests ── */}
        {statsLoading && (
          <div className="space-y-2.5">
            <MSkeletonCard />
            <MSkeletonCard />
          </div>
        )}
        {statsError && (
          <MErrorState
            title="Không tải được dữ liệu"
            description="Kiểm tra kết nối và thử lại."
            onRetry={() => refetchStats()}
          />
        )}
        {!statsLoading && (mockTests || []).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mock Test</p>
              <button onClick={() => navigate("/mock-test")} className="text-xs font-bold text-brand-gold">
                Xem tất cả →
              </button>
            </div>
            <div className="space-y-2">
              {(mockTests || []).slice(0, 3).map((mt: any) => {
                const histEntry = (mockHistory || []).find((h: any) => h.mockTestId === mt.id);
                const done = histEntry?.status === "COMPLETED";
                const inProg = histEntry && !done;
                return (
                  <button
                    key={mt.id}
                    onClick={() => navigate(`/mock-test/${mt.id}`)}
                    className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left shadow-sm border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-amber-600">
                        {mt.code?.replace(/\D/g, "").slice(-2) || "??"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{mt.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{mt.durationMinutes} phút</p>
                    </div>
                    <MBadge color={done ? "green" : inProg ? "gold" : "gray"}>
                      {done ? "✓ Xong" : inProg ? "Tiếp tục" : "Chưa làm"}
                    </MBadge>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
