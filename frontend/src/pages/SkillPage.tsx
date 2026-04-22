import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { questionsApi } from '../api';
import { QuestionSkill, QuestionType, QUESTION_TYPE_LABELS, SKILL_TYPES } from '../types';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, Badge, ProgressBar } from '../components/ui';

const SKILL_META: Record<QuestionSkill, { label: string; icon: string; color: string }> = {
  SPEAKING: { label: 'Speaking', icon: '🎙️', color: 'yellow' },
  WRITING: { label: 'Writing', icon: '✍️', color: 'orange' },
  READING: { label: 'Reading', icon: '📖', color: 'black' },
  LISTENING: { label: 'Listening', icon: '🎧', color: 'gradient' },
};

const TYPE_ICONS: Partial<Record<QuestionType, string>> = {
  SPEAKING_READ_ALOUD: '🔊',
  SPEAKING_REPEAT_SENTENCE: '🔁',
  SPEAKING_DESCRIBE_IMAGE: '🖼️',
  SPEAKING_RETELL_LECTURE: '🎓',
  SPEAKING_ANSWER_SHORT_QUESTION: '❓',
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: '👥',
  SPEAKING_RESPOND_TO_SITUATION: '💬',
  WRITING_SUMMARIZE_WRITTEN_TEXT: '📄',
  WRITING_ESSAY: '✏️',
  READING_FIB_R_W: '📝',
  READING_MCQ_MULTIPLE_ANSWER: '☑️',
  READING_RE_ORDER_PARAGRAPH: '🔀',
  READING_FIB_R: '🔲',
  READING_MCQ_SINGLE_ANSWER: '🔘',
  LISTENING_SUMMARIZE_SPOKEN_TEXT: '📋',
  LISTENING_MCQ_MULTIPLE_ANSWER: '☑️',
  LISTENING_FIB_L: '⬜',
  LISTENING_HIGHLIGHT_CORRECT_SUMMARY: '✅',
  LISTENING_MCQ_SINGLE_ANSWER: '🔘',
  LISTENING_SELECT_MISSING_WORD: '🔍',
  LISTENING_HIGHLIGHT_INCORRECT_WORD: '🔆',
  LISTENING_DICTATION: '✍️',
};

const HAS_AI: QuestionType[] = [
  'SPEAKING_READ_ALOUD','SPEAKING_REPEAT_SENTENCE','SPEAKING_DESCRIBE_IMAGE',
  'SPEAKING_RETELL_LECTURE','SPEAKING_ANSWER_SHORT_QUESTION',
  'SPEAKING_SUMMARISE_GROUP_DISCUSSION','SPEAKING_RESPOND_TO_SITUATION',
  'WRITING_SUMMARIZE_WRITTEN_TEXT','WRITING_ESSAY','LISTENING_SUMMARIZE_SPOKEN_TEXT',
  'LISTENING_DICTATION',
];

export default function SkillPage() {
  const { skill } = useParams<{ skill: string }>();
  const navigate = useNavigate();
  const skillKey = (skill || '').toUpperCase() as QuestionSkill;
  const meta = SKILL_META[skillKey];
  const types = SKILL_TYPES[skillKey] || [];

  const { data: progress } = useQuery({
    queryKey: ['skillProgress', skillKey],
    queryFn: () => questionsApi.getSkillProgress(skillKey),
    enabled: !!skillKey,
  });

  // For each type, fetch first question to navigate directly
  const { data: firstQuestions } = useQuery({
    queryKey: ['firstQuestions', skillKey],
    queryFn: async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        types.map(async (type) => {
          // Increase limit for DI to find a valid one with an image
          const limit = type === 'SPEAKING_DESCRIBE_IMAGE' ? 20 : 1;
          const data = await questionsApi.list({ type, page: 1, limit });
          
          if (type === 'SPEAKING_DESCRIBE_IMAGE') {
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

  if (!meta) return <MainLayout><div className="p-8">Skill not found</div></MainLayout>;

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F7F6F3]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xl">{meta.icon}</span>
            <h1 className="font-display font-black text-lg text-gray-900">{meta.label}</h1>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{types.length} dạng bài</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">📊 Báo cáo</Button>
            <Button variant="yellow" size="sm" onClick={() => navigate('/mock-test')}>✈️ Thi thử ngay</Button>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Grid of question types */}
          <div className={clsx('grid gap-4', types.length <= 2 ? 'grid-cols-2' : types.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
            {types.map((type, idx) => {
              const prog = progress?.[type] || { total: 0, done: 0 };
              const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
              const firstQ = firstQuestions?.[type];
              const accentColors = ['yellow', 'orange', 'black', 'gradient', 'yellow', 'orange', 'black', 'gradient'];
              const color = accentColors[idx % accentColors.length];
              const hasAI = HAS_AI.includes(type);

              return (
                <div
                  key={type}
                  onClick={() => firstQ && navigate(`/question/${firstQ.id}`)}
                  className={clsx(
                    'card p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand-yellow relative overflow-hidden',
                    !firstQ && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {/* Accent bar */}
                  <div className={clsx('absolute top-0 left-0 right-0 h-[3px]',
                    color === 'yellow' ? 'bg-brand-yellow' :
                    color === 'orange' ? 'bg-brand-orange' :
                    color === 'black' ? 'bg-brand-black' :
                    'bg-gradient-to-r from-brand-yellow to-brand-orange'
                  )} />

                  <div className="flex items-start justify-between mb-3 mt-1">
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                      color === 'yellow' ? 'bg-brand-yellow-light' :
                      color === 'orange' ? 'bg-brand-orange-light' : 'bg-gray-100'
                    )}>
                      {TYPE_ICONS[type] || '📌'}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasAI && <span className="tag-ai">AI CHẤM</span>}
                      {(type.includes('READING') || type.includes('LISTENING')) && !hasAI && (
                        <span className="tag-expl">Giải thích</span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-display font-black text-[14px] text-gray-900 mb-1 leading-snug">
                    {QUESTION_TYPE_LABELS[type]}
                  </h3>
                  <p className="text-[11px] text-gray-400 mb-3">
                    {prog.done}/{prog.total} câu đã làm
                  </p>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-gray-400 font-semibold">Tiến độ</span>
                    <span className="text-[11px] font-black text-gray-700">{prog.done}/{prog.total}</span>
                  </div>
                  <ProgressBar value={prog.done} max={prog.total || 1} color={color} />

                  <div className="flex items-center justify-between mt-3">
                    <span className={clsx(
                      'text-[11px] font-black px-2 py-0.5 rounded',
                      color === 'yellow' ? 'bg-brand-yellow-light text-brand-yellow-deep' :
                      color === 'orange' ? 'bg-brand-orange-light text-brand-orange-deep' : 'bg-gray-100 text-gray-600'
                    )}>{pct}%</span>
                    <span className={clsx(
                      'text-[12px] font-black px-3 py-1.5 rounded-lg transition-colors',
                      color === 'yellow' ? 'bg-brand-yellow text-brand-black hover:bg-brand-yellow-deep' :
                      color === 'orange' ? 'bg-brand-orange text-white hover:bg-brand-orange-deep' :
                      'bg-brand-black text-brand-yellow hover:bg-brand-dark2'
                    )}>
                      {prog.done > 0 ? 'Tiếp tục →' : 'Bắt đầu →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
