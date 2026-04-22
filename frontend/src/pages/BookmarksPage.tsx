import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { questionsApi } from '../api';
import { MainLayout } from '../components/layout/Sidebar';
import { Button, Badge } from '../components/ui';
import { QUESTION_TYPE_LABELS, QuestionType } from '../types';

function getBookmarkedIds(): string[] {
  try { return JSON.parse(localStorage.getItem('fly_edu_bookmarks') || '[]'); } catch { return []; }
}

function removeBookmark(id: string) {
  const all = getBookmarkedIds().filter((x) => x !== id);
  localStorage.setItem('fly_edu_bookmarks', JSON.stringify(all));
}

const SKILL_COLOR: Record<string, string> = {
  SPEAKING: 'yellow', WRITING: 'orange', READING: 'black', LISTENING: 'gradient',
};

const SKILL_ICON: Record<string, string> = {
  SPEAKING: '🎙️', WRITING: '✍️', READING: '📖', LISTENING: '🎧',
};

export default function BookmarksPage() {
  const navigate = useNavigate();
  const ids = getBookmarkedIds();

  const { data: questions = [], isLoading, refetch } = useQuery({
    queryKey: ['bookmarked-questions', ids.join(',')],
    queryFn: () => questionsApi.getByIds(ids),
    enabled: ids.length > 0,
  });

  const handleRemove = (id: string) => {
    removeBookmark(id);
    refetch();
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F7F6F3]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-lg">🔖 Câu hỏi đã bookmark</h1>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {ids.length} câu
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>← Dashboard</Button>
        </div>

        <div className="px-8 py-6 max-w-3xl mx-auto">
          {ids.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-4xl mb-4">🔖</p>
              <h2 className="font-display font-black text-xl mb-2">Chưa có bookmark nào</h2>
              <p className="text-sm text-gray-400 mb-6">Click nút 🔖 khi luyện tập để lưu câu hỏi vào đây</p>
              <Button variant="yellow" onClick={() => navigate('/practice/speaking')}>
                Bắt đầu luyện tập →
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {(questions as any[]).map((q) => {
                const color = SKILL_COLOR[q.skill] || 'yellow';
                return (
                  <div key={q.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Skill icon */}
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
                        color === 'yellow' ? 'bg-brand-yellow-light' :
                        color === 'orange' ? 'bg-brand-orange-light' : 'bg-gray-100'
                      )}>
                        {SKILL_ICON[q.skill] || '📌'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {q.code}
                          </span>
                          {q.isRepeated && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-pink-500 text-white rounded uppercase">REPEATED</span>
                          )}
                          {q.isTrending && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-brand-yellow text-brand-black rounded uppercase">HOT</span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-0.5">
                          {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                        </p>
                        {q.title && (
                          <p className="text-xs text-gray-400 truncate">{q.title}</p>
                        )}
                        {!q.title && q.content && (
                          <p className="text-xs text-gray-400 truncate">{q.content.substring(0, 80)}...</p>
                        )}
                      </div>

                      {/* Level */}
                      <span className={clsx(
                        'text-[10px] font-bold px-2 py-1 rounded flex-shrink-0',
                        q.level === 'Easy' ? 'bg-green-100 text-green-700' :
                        q.level === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {q.level}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="yellow" size="sm" onClick={() => navigate(`/question/${q.id}`)}>
                          Luyện tập →
                        </Button>
                        <button
                          onClick={() => handleRemove(q.id)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                          title="Xoá bookmark"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="text-center pt-4">
                <p className="text-xs text-gray-400">
                  {questions.length} / {ids.length} câu đã tải · Bookmark lưu trên thiết bị này
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
