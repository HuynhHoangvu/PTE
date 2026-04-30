import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../../api";
import { MobileHeader } from "../layout/MobileShell";
import { MSkeleton } from "../ui";
import { QuestionSkill, SKILL_TYPES } from "../../types";

const SKILL_META: { key: QuestionSkill; label: string; short: string; color: string; bg: string; icon: string }[] = [
  { key: "SPEAKING",  label: "Speaking",  short: "Nói",  color: "#f59e0b", bg: "bg-amber-50",  icon: "🎙️" },
  { key: "WRITING",   label: "Writing",   short: "Viết", color: "#3b82f6", bg: "bg-blue-50",   icon: "✍️" },
  { key: "READING",   label: "Reading",   short: "Đọc",  color: "#22c55e", bg: "bg-green-50",  icon: "📖" },
  { key: "LISTENING", label: "Listening", short: "Nghe", color: "#a855f7", bg: "bg-purple-50", icon: "🎧" },
];

// ── Radar Chart (SVG) ─────────────────────────────────────────────────────────
function RadarChart({
  data, size = 220,
}: {
  data: { value: number; max: number; color: string; label: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const n = data.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const angle = (i: number) => ((i * 360) / n - 90) * (Math.PI / 180);

  const pt = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  });

  const outer = (i: number) => pt(i, 1);

  const dataPoints = data.map((d, i) => pt(i, Math.min(d.value / d.max, 1)));
  const outerPoints = data.map((_, i) => outer(i));

  const toPolygon = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const labelPt = (i: number) => {
    const a = angle(i);
    const dist = r + 26;
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid polygons */}
      {gridLevels.map((lvl, li) => (
        <polygon
          key={li}
          points={toPolygon(data.map((_, i) => pt(i, lvl)))}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={li === 3 ? 1.5 : 1}
        />
      ))}

      {/* Spokes */}
      {outerPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={1} />
      ))}

      {/* Data fill */}
      <polygon
        points={toPolygon(dataPoints)}
        fill="rgba(228,168,8,0.12)"
        stroke="#f59e0b"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={data[i].color} stroke="white" strokeWidth={2} />
      ))}

      {/* Labels */}
      {data.map((d, i) => {
        const lp = labelPt(i);
        const pct = Math.round((d.value / d.max) * 100);
        return (
          <g key={i}>
            <text x={lp.x} y={lp.y - 6} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontWeight="800" fill="#374151">
              {d.label}
            </text>
            <text x={lp.x} y={lp.y + 8} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill={d.color} fontWeight="bold">
              {pct}%
            </text>
          </g>
        );
      })}

      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fill="#9ca3af">Điểm TB</text>
      <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight="black" fill="#111827">
        {Math.round(data.reduce((s, d) => s + d.value, 0) / n)}
      </text>
    </svg>
  );
}

// ── Skill bar row ─────────────────────────────────────────────────────────────
function SkillRow({
  meta, count, avg, onPress
}: {
  meta: typeof SKILL_META[0];
  count: number;
  avg: number;
  onPress: () => void;
}) {
  const pct = Math.min((avg / 90) * 100, 100);
  const strength = avg >= 70 ? "Tốt" : avg >= 50 ? "Trung bình" : avg > 0 ? "Cần cải thiện" : "Chưa luyện";
  const strengthColor = avg >= 70 ? "text-green-600" : avg >= 50 ? "text-amber-600" : avg > 0 ? "text-red-500" : "text-gray-400";

  return (
    <button
      onClick={onPress}
      className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform shadow-sm border border-gray-100 text-left"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${meta.bg}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-bold text-sm text-gray-900">{meta.label}</p>
          <div className="text-right">
            <p className="text-xs font-black" style={{ color: meta.color }}>{avg > 0 ? avg : "—"}/90</p>
            <p className={`text-[9px] font-bold ${strengthColor}`}>{strength}</p>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: meta.color }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{count} câu đã làm</p>
      </div>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MAnalyticsPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: usersApi.getStats,
  });

  const skillData = SKILL_META.map((m) => {
    const s = stats?.skillStats?.[m.key] || { count: 0, avgScore: 0 };
    return { meta: m, count: s.count, avg: Math.round(s.avgScore || 0) };
  });

  const radarData = skillData.map((s) => ({
    label: s.meta.short,
    value: s.avg,
    max: 90,
    color: s.meta.color,
  }));

  const weakSkills = [...skillData].sort((a, b) => a.avg - b.avg).filter(s => s.count > 0);

  const weakTypes: { skill: typeof SKILL_META[0]; type: string; count: number }[] = [];
  if (stats?.typeStats) {
    for (const skill of SKILL_META) {
      const types = SKILL_TYPES[skill.key] || [];
      for (const t of types) {
        const ts = stats.typeStats[t];
        if (ts && ts.avgScore < 50 && ts.count > 0) {
          weakTypes.push({ skill, type: t, count: ts.count });
        }
      }
    }
  }

  const totalAttempts = stats?.totalAttempts || 0;
  const avgOverall = Math.round(stats?.avgScore || 0);

  return (
    <>
      <MobileHeader
        title="Phân tích"
        subtitle="Theo dõi tiến độ của bạn"
        right={
          <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-black text-brand-gold">{totalAttempts} câu</span>
          </div>
        }
      />

      <div className="px-4 space-y-4 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            <MSkeleton className="h-64 w-full rounded-3xl" />
            <MSkeleton className="h-20 w-full rounded-2xl" />
            <MSkeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* ── Radar Chart card ── */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display font-black text-base text-gray-900">Biểu đồ kỹ năng</p>
                  <p className="text-xs text-gray-400">Điểm trung bình theo 4 kỹ năng PTE</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-2xl text-gray-900">{avgOverall}</p>
                  <p className="text-[9px] text-gray-400 font-bold">/ 90 TB</p>
                </div>
              </div>
              <div className="flex justify-center">
                <RadarChart data={radarData} size={220} />
              </div>
            </div>

            {/* ── Overall stats strip ── */}
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
            >
              {[
                { label: "Điểm TB", value: avgOverall, unit: "/90" },
                { label: "Đã làm", value: totalAttempts, unit: " câu" },
                { label: "Streak", value: stats?.streakDays || 0, unit: " ngày 🔥" },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="w-px h-8 bg-white/10" />}
                  <div className="flex-1 text-center">
                    <p className="font-display font-black text-xl text-white leading-none">
                      {s.value}<span className="text-xs text-white/40 font-normal">{s.unit}</span>
                    </p>
                    <p className="text-[9px] text-white/40 font-bold mt-0.5 uppercase tracking-wider">{s.label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* ── Skill breakdown ── */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Chi tiết theo kỹ năng
              </p>
              <div className="space-y-2.5">
                {skillData.map((s) => (
                  <SkillRow
                    key={s.meta.key}
                    meta={s.meta}
                    count={s.count}
                    avg={s.avg}
                    onPress={() => navigate(`/practice/${s.meta.key.toLowerCase()}`)}
                  />
                ))}
              </div>
            </div>

            {/* ── Weak areas ── */}
            {weakSkills.length > 0 && (
              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  🎯 Cần cải thiện ngay
                </p>
                <div className="space-y-2.5">
                  {weakSkills.slice(0, 3).map((s) => (
                    <button
                      key={s.meta.key}
                      onClick={() => navigate(`/practice/${s.meta.key.toLowerCase()}`)}
                      className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl flex-shrink-0">
                        {s.meta.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900">{s.meta.label}</p>
                        <p className="text-xs text-red-500 font-medium mt-0.5">
                          Điểm {s.avg}/90 · Luyện ngay để cải thiện
                        </p>
                      </div>
                      <span className="text-sm text-red-400">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {totalAttempts === 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-6 text-center">
                <p className="text-3xl mb-3">📊</p>
                <p className="font-bold text-gray-900 mb-1">Chưa có dữ liệu phân tích</p>
                <p className="text-sm text-gray-500 mb-4">Hãy luyện tập để xem biểu đồ tiến độ của bạn</p>
                <button
                  onClick={() => navigate("/practice/speaking")}
                  className="bg-brand-gold text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
                >
                  Bắt đầu luyện tập →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
