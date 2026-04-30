import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { questionsApi } from "../../api";
import { QuestionSkill, QuestionType, QUESTION_TYPE_LABELS, SKILL_TYPES } from "../../types";
import { MobileBackHeader } from "../layout/MobileShell";
import { MBadge, MProgressBar, MSkeleton } from "../ui";

const SKILL_META: Record<QuestionSkill, { label: string; icon: string }> = {
  SPEAKING: { label: "Speaking", icon: "🎙️" },
  WRITING: { label: "Writing", icon: "✍️" },
  READING: { label: "Reading", icon: "📖" },
  LISTENING: { label: "Listening", icon: "🎧" },
};

const TYPE_ICONS: Partial<Record<QuestionType, string>> = {
  SPEAKING_READ_ALOUD: "🔊",
  SPEAKING_REPEAT_SENTENCE: "🔁",
  SPEAKING_DESCRIBE_IMAGE: "🖼️",
  SPEAKING_RETELL_LECTURE: "🎓",
  SPEAKING_ANSWER_SHORT_QUESTION: "❓",
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: "👥",
  SPEAKING_RESPOND_TO_SITUATION: "💬",
  WRITING_SUMMARIZE_WRITTEN_TEXT: "📄",
  WRITING_ESSAY: "✏️",
  READING_FIB_R_W: "📝",
  READING_MCQ_MULTIPLE_ANSWER: "☑️",
  READING_RE_ORDER_PARAGRAPH: "🔀",
  READING_FIB_R: "🔲",
  READING_MCQ_SINGLE_ANSWER: "🔘",
  LISTENING_SUMMARIZE_SPOKEN_TEXT: "📋",
  LISTENING_MCQ_MULTIPLE_ANSWER: "☑️",
  LISTENING_FIB_L: "⬜",
  LISTENING_HIGHLIGHT_CORRECT_SUMMARY: "✅",
  LISTENING_MCQ_SINGLE_ANSWER: "🔘",
  LISTENING_SELECT_MISSING_WORD: "🔍",
  LISTENING_HIGHLIGHT_INCORRECT_WORD: "🔆",
  LISTENING_DICTATION: "✍️",
};

const HAS_AI: QuestionType[] = [
  "SPEAKING_READ_ALOUD",
  "SPEAKING_REPEAT_SENTENCE",
  "SPEAKING_DESCRIBE_IMAGE",
  "SPEAKING_RETELL_LECTURE",
  "SPEAKING_ANSWER_SHORT_QUESTION",
  "SPEAKING_SUMMARISE_GROUP_DISCUSSION",
  "SPEAKING_RESPOND_TO_SITUATION",
  "WRITING_SUMMARIZE_WRITTEN_TEXT",
  "WRITING_ESSAY",
  "LISTENING_SUMMARIZE_SPOKEN_TEXT",
  "LISTENING_DICTATION",
];

export default function MSkillPage() {
  const { skill } = useParams<{ skill: string }>();
  const navigate = useNavigate();
  const skillKey = (skill || "").toUpperCase() as QuestionSkill;
  const meta = SKILL_META[skillKey];
  const types = SKILL_TYPES[skillKey] || [];

  const { data: progress, isLoading: progLoading } = useQuery({
    queryKey: ["skillProgress", skillKey],
    queryFn: () => questionsApi.getSkillProgress(skillKey),
    enabled: !!skillKey,
  });

  const { data: firstQuestions } = useQuery({
    queryKey: ["firstQuestions", skillKey],
    queryFn: async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        types.map(async (type) => {
          const limit = type === "SPEAKING_DESCRIBE_IMAGE" ? 20 : 1;
          const data = await questionsApi.list({ type, page: 1, limit });
          if (type === "SPEAKING_DESCRIBE_IMAGE") {
            const valid = data.data?.find((q: any) => !!q.imageUrl);
            if (valid) results[type] = valid;
          } else {
            if (data.data?.[0]) results[type] = data.data[0];
          }
        })
      );
      return results;
    },
    enabled: types.length > 0,
  });

  const skillColorClass: Record<QuestionSkill, string> = {
    SPEAKING: "skill-icon-speaking",
    WRITING: "skill-icon-writing",
    READING: "skill-icon-reading",
    LISTENING: "skill-icon-listening",
  };

  if (!meta) {
    return (
      <div className="mobile-page-full flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy kỹ năng.</p>
      </div>
    );
  }

  return (
    <div className="mobile-page-full">
      {/* Header */}
      <MobileBackHeader
        title={`${meta.icon} ${meta.label}`}
        onBack={() => navigate("/practice")}
        right={
          <button
            onClick={() => navigate("/mock-test")}
            className="text-xs font-bold text-brand-gold bg-brand-gold-soft px-3 py-1.5 rounded-xl"
          >
            Thi thử
          </button>
        }
      />

      <div className="practice-mobile-body px-4 space-y-3 py-4">
        {/* Banner */}
        <div
          className={clsx(
            "rounded-2xl p-4 flex items-center gap-3",
            skillColorClass[skillKey],
            "bg-opacity-10"
          )}
          style={{ background: "rgba(228,168,8,0.07)", border: "1px solid rgba(228,168,8,0.15)" }}
        >
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <p className="font-display font-black text-base text-gray-900">{meta.label}</p>
            <p className="text-xs text-gray-500">{types.length} dạng bài luyện tập</p>
          </div>
        </div>

        {/* Type cards */}
        {progLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <MSkeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {types.map((type, idx) => {
              const prog = progress?.[type] || { total: 0, done: 0 };
              const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
              const firstQ = firstQuestions?.[type];
              const hasAI = HAS_AI.includes(type);

              return (
                <button
                  key={type}
                  onClick={() => navigate(`/practice/${skill}/${type.toLowerCase()}`)}
                  className="w-full m-card-elevated rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold-soft flex items-center justify-center text-lg flex-shrink-0">
                      {TYPE_ICONS[type] || "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-display font-bold text-[13px] text-gray-900 leading-snug">
                          {QUESTION_TYPE_LABELS[type]}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          {hasAI && <MBadge color="gold">AI</MBadge>}
                        </div>
                      </div>
                      <MProgressBar value={prog.done} max={prog.total || 1} height="h-1.5" animated />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400">
                          {prog.done}/{prog.total} câu
                        </span>
                        <span className="text-[10px] font-bold text-brand-gold">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-gold flex items-center justify-center mt-1 shadow-gold-sm">
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
