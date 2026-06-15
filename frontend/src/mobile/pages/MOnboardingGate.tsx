import React from "react";
import { logoUrl } from "../../assets";

const KEY_ONBOARDING = "fly_onboarding_v2";
const KEY_TERMS_ACCEPTED = "fly_terms_accepted_v1";
export const KEY_TARGET_SCORE = "fly_target_score";
export const KEY_EXAM_DATE = "fly_exam_date";

export function useUserGoals() {
  return {
    targetScore: localStorage.getItem(KEY_TARGET_SCORE) || "",
    examDate: localStorage.getItem(KEY_EXAM_DATE) || "",
  };
}

type Phase = "splash" | "slides" | "personalize" | "consent" | "done";

const SLIDES = [
  {
    emoji: "🤖",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #292929 100%)",
    accent: "#f59e0b",
    title: "AI chấm điểm tức thì",
    desc: "Nhận phản hồi chi tiết về phát âm, ngữ pháp và từ vựng chỉ trong vài giây — giống như có gia sư riêng.",
  },
  {
    emoji: "📋",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    accent: "#3b82f6",
    title: "Bám sát đề thi thật",
    desc: "Ngân hàng câu hỏi cập nhật liên tục, bám sát cấu trúc và định dạng đề thi PTE chính thức.",
  },
  {
    emoji: "📱",
    bg: "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
    accent: "#22c55e",
    title: "Học mọi lúc mọi nơi",
    desc: "Luyện Speaking, Writing, Reading, Listening ngay trên điện thoại. Ôn bài trên xe buýt, giờ nghỉ trưa…",
  },
];

const TARGET_SCORES = [
  { value: "30", label: "30+", desc: "Nhập học", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "50", label: "50+", desc: "Phổ thông", color: "bg-green-50 border-green-200 text-green-700" },
  { value: "65", label: "65+", desc: "Đại học", color: "bg-amber-50 border-amber-300 text-amber-800" },
  { value: "79", label: "79+", desc: "Cao học", color: "bg-red-50 border-red-300 text-red-700" },
];

export function MOnboardingGate({ children }: { children: React.ReactNode }) {
  const done = localStorage.getItem(KEY_ONBOARDING) === "1";
  const [phase, setPhase] = React.useState<Phase>(done ? "done" : "splash");

  const finish = () => {
    localStorage.setItem(KEY_ONBOARDING, "1");
    setPhase("done");
  };

  if (phase === "done") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden bg-black">
      {phase === "splash" && <SplashScreen onDone={() => setPhase("slides")} />}
      {phase === "slides" && <OnboardingSlides onDone={() => setPhase("personalize")} />}
      {phase === "personalize" && <PersonalizeScreen onDone={() => setPhase("consent")} />}
      {phase === "consent" && <ConsentScreen onDone={finish} />}
    </div>
  );
}

// ── Splash ────────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef3c7 50%, #fde68a 100%)" }}
    >
      <div
        className="flex flex-col items-center gap-4 transition-all duration-700"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)" }}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-brand-gold/20 blur-2xl scale-110" />
          <img src={logoUrl} alt="FLY Academy" className="relative w-40 h-auto drop-shadow-xl" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-amber-900 tracking-wide">FLY Academic</p>
          <p className="text-sm text-amber-700 mt-1">Luyện thi PTE · AI Chấm điểm</p>
        </div>
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Slides ─────────────────────────────────────────────────────────
function OnboardingSlides({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = React.useState(0);
  const [animDir, setAnimDir] = React.useState<"in" | "out">("in");
  const slide = SLIDES[current];

  const goTo = (idx: number) => {
    setAnimDir("out");
    setTimeout(() => {
      setCurrent(idx);
      setAnimDir("in");
    }, 200);
  };

  const next = () => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else onDone();
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: slide.bg }}>
      {/* Skip */}
      <div className="flex justify-end px-6 pt-14">
        <button onClick={onDone} className="text-sm text-white/50 font-medium active:opacity-70">
          Bỏ qua
        </button>
      </div>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-200"
        style={{ opacity: animDir === "in" ? 1 : 0, transform: animDir === "in" ? "translateY(0)" : "translateY(16px)" }}
      >
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mb-8 shadow-2xl"
          style={{ background: `${slide.accent}22`, border: `2px solid ${slide.accent}44` }}
        >
          {slide.emoji}
        </div>
        <h2 className="font-display font-black text-2xl text-white leading-tight mb-4">
          {slide.title}
        </h2>
        <p className="text-sm text-white/70 leading-relaxed max-w-xs">
          {slide.desc}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? slide.accent : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full min-h-[54px] rounded-2xl font-bold text-base text-gray-900 active:scale-[0.97] transition-transform shadow-lg"
          style={{ background: slide.accent }}
        >
          {current < SLIDES.length - 1 ? "Tiếp theo →" : "Bắt đầu ngay 🚀"}
        </button>
      </div>
    </div>
  );
}

// ── Personalize ───────────────────────────────────────────────────────────────
function PersonalizeScreen({ onDone }: { onDone: () => void }) {
  const [target, setTarget] = React.useState(localStorage.getItem(KEY_TARGET_SCORE) || "");
  const [examDate, setExamDate] = React.useState(localStorage.getItem(KEY_EXAM_DATE) || "");
  const [step, setStep] = React.useState<"score" | "date">("score");

  const saveAndNext = () => {
    if (target) localStorage.setItem(KEY_TARGET_SCORE, target);
    if (examDate) localStorage.setItem(KEY_EXAM_DATE, examDate);
    onDone();
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef9e7 100%)" }}
    >
      {/* Header */}
      <div className="px-6 pt-16 pb-6 text-center">
        <p className="text-3xl mb-3">{step === "score" ? "🎯" : "📅"}</p>
        <h2 className="font-display font-black text-2xl text-gray-900">
          {step === "score" ? "Mục tiêu của bạn?" : "Ngày thi dự kiến?"}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          {step === "score"
            ? "App sẽ cá nhân hóa lộ trình học theo mục tiêu điểm số của bạn"
            : "Để app tạo đồng hồ đếm ngược và điều chỉnh cường độ học tập"}
        </p>
      </div>

      <div className="flex-1 px-6 space-y-4">
        {step === "score" ? (
          <div className="grid grid-cols-2 gap-3">
            {TARGET_SCORES.map((ts) => (
              <button
                key={ts.value}
                onClick={() => setTarget(ts.value)}
                className={[
                  "rounded-2xl p-4 border-2 text-left transition-all active:scale-[0.97]",
                  target === ts.value
                    ? "border-brand-gold bg-brand-gold-soft shadow-gold-sm"
                    : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <p className="font-display font-black text-2xl text-gray-900">{ts.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{ts.desc}</p>
                {target === ts.value && (
                  <div className="mt-2 w-5 h-5 rounded-full bg-brand-gold flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="m-card-elevated rounded-2xl p-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">Chọn ngày thi</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-brand-gold"
            />
            {examDate && (() => {
              const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
              return days > 0 ? (
                <div className="mt-3 bg-amber-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-black text-amber-900">{days}</p>
                  <p className="text-xs text-amber-700 font-medium">ngày còn lại đến kỳ thi</p>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-6 space-y-3">
        {step === "score" ? (
          <>
            <button
              onClick={() => setStep("date")}
              disabled={!target}
              className="w-full min-h-[54px] rounded-2xl font-bold text-base bg-brand-gold text-white shadow-gold-sm active:scale-[0.97] transition-all disabled:opacity-40"
            >
              Tiếp theo →
            </button>
            <button onClick={onDone} className="w-full text-sm text-gray-400 active:opacity-70">
              Bỏ qua, cài sau trong Profile
            </button>
          </>
        ) : (
          <>
            <button
              onClick={saveAndNext}
              className="w-full min-h-[54px] rounded-2xl font-bold text-base bg-brand-gold text-white shadow-gold-sm active:scale-[0.97] transition-all"
            >
              Bắt đầu học ngay 🚀
            </button>
            <button onClick={saveAndNext} className="w-full text-sm text-gray-400 active:opacity-70">
              Bỏ qua
            </button>
          </>
        )}
        <p className="text-center text-[11px] text-gray-300 pt-1">
          Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng & Chính sách Bảo mật của FLY Academic
        </p>
      </div>
    </div>
  );
}

function ConsentScreen({ onDone }: { onDone: () => void }) {
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [agreePrivacy, setAgreePrivacy] = React.useState(false);

  const canContinue = agreeTerms && agreePrivacy;

  const handleContinue = () => {
    if (!canContinue) return;
    localStorage.setItem(KEY_TERMS_ACCEPTED, "1");
    onDone();
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef9e7 100%)" }}
    >
      <div className="px-6 pt-16 pb-4 text-center">
        <p className="text-3xl mb-3">📄</p>
        <h2 className="font-display font-black text-2xl text-gray-900">
          Đồng ý điều khoản sử dụng
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Trước khi sử dụng ứng dụng, vui lòng đọc và xác nhận đồng ý các chính sách bên dưới.
        </p>
      </div>

      <div className="flex-1 px-6 space-y-4">
        <div className="m-card-elevated rounded-2xl bg-white p-5 space-y-4">
          <button
            onClick={() => window.location.href = "/terms"}
            className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 active:scale-[0.99] transition-all"
          >
            <p className="font-bold text-gray-900">Điều khoản sử dụng</p>
            <p className="text-xs text-gray-500 mt-1">Xem chi tiết điều khoản của FLY Academic</p>
          </button>

          <button
            onClick={() => window.location.href = "/privacy"}
            className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 active:scale-[0.99] transition-all"
          >
            <p className="font-bold text-gray-900">Chính sách quyền riêng tư</p>
            <p className="text-xs text-gray-500 mt-1">Xem cách thu thập và sử dụng dữ liệu của bạn</p>
          </button>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-amber-500"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Tôi đã đọc và đồng ý với <strong>Điều khoản sử dụng</strong>.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-amber-500"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Tôi đã đọc và đồng ý với <strong>Chính sách quyền riêng tư</strong>.
            </span>
          </label>
        </div>
      </div>

      <div className="px-6 pb-10 pt-6">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full min-h-[54px] rounded-2xl font-bold text-base bg-brand-gold text-white shadow-gold-sm active:scale-[0.97] transition-all disabled:opacity-40"
        >
          Đồng ý và tiếp tục
        </button>
      </div>
    </div>
  );
}
