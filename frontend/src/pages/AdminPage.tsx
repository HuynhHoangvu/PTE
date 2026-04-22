import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { questionsApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import { MainLayout } from "../components/layout/Sidebar";
import { Button } from "../components/ui";
import { QUESTION_TYPE_LABELS, QuestionType, SKILL_TYPES } from "../types";

const SKILLS = ["SPEAKING", "WRITING", "READING", "LISTENING"];
const LEVELS = ["Easy", "Medium", "Hard"];

const EMPTY_FORM = {
  skill: "SPEAKING",
  type: "SPEAKING_READ_ALOUD" as QuestionType,
  level: "Medium",
  title: "",
  content: "",
  audioUrl: "",
  imageUrl: "",
  options: "",
  correctAnswer: "",
  isRepeated: false,
  isTrending: false,
};

type FormState = typeof EMPTY_FORM;

function JsonTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [error, setError] = React.useState("");
  const handleChange = (v: string) => {
    onChange(v);
    try {
      if (v.trim()) JSON.parse(v);
      setError("");
    } catch {
      setError("JSON không hợp lệ");
    }
  };
  return (
    <div>
      <label className="text-xs font-bold text-gray-600 block mb-1">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={clsx(
          "w-full text-xs font-mono border rounded-lg px-3 py-2 focus:outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-200"
            : "border-gray-200 focus:ring-brand-yellow/30",
        )}
        placeholder='e.g. ["Option A", "Option B"] or {"text":"..."}'
      />
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function QuestionModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial: FormState & { id?: string };
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = React.useState<FormState & { id?: string }>(initial);

  const set = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const availableTypes =
    SKILL_TYPES[form.skill as keyof typeof SKILL_TYPES] || [];

  React.useEffect(() => {
    if (!availableTypes.includes(form.type)) {
      set("type", availableTypes[0]);
    }
  }, [form.skill]);

  const handleSubmit = () => {
    const payload: any = {
      skill: form.skill,
      type: form.type,
      level: form.level,
      isRepeated: form.isRepeated,
      isTrending: form.isTrending,
    };
    if (form.title.trim()) payload.title = form.title.trim();
    if (form.content.trim()) payload.content = form.content.trim();
    if (form.audioUrl.trim()) payload.audioUrl = form.audioUrl.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    try {
      if (form.options.trim()) payload.options = JSON.parse(form.options);
    } catch {}
    try {
      if (form.correctAnswer.trim())
        payload.correctAnswer = JSON.parse(form.correctAnswer);
    } catch {
      if (form.correctAnswer.trim())
        payload.correctAnswer = form.correctAnswer.trim();
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-black text-lg">
            {form.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Skill / Type / Level */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Skill *
              </label>
              <select
                value={form.skill}
                onChange={(e) => set("skill", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
              >
                {SKILLS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as QuestionType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t} – {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Level *
              </label>
              <select
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
              placeholder="Tiêu đề câu hỏi (tuỳ chọn)"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Content / Passage
            </label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30 resize-y"
              placeholder="Nội dung đoạn văn, câu hỏi..."
            />
          </div>

          {/* Audio / Image URLs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Audio URL
              </label>
              <input
                value={form.audioUrl}
                onChange={(e) => set("audioUrl", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
                placeholder="/uploads/audio/..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Image URL
              </label>
              <input
                value={form.imageUrl}
                onChange={(e) => set("imageUrl", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Options & Correct Answer */}
          <JsonTextarea
            label="Options (JSON)"
            value={form.options}
            onChange={(v) => set("options", v)}
          />
          <JsonTextarea
            label="Correct Answer (JSON or string)"
            value={form.correctAnswer}
            onChange={(v) => set("correctAnswer", v)}
          />

          {/* Flags */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRepeated}
                onChange={(e) => set("isRepeated", e.target.checked)}
                className="w-4 h-4 accent-pink-500"
              />
              <span className="text-sm font-bold text-gray-700">
                Repeated (đề thi thật)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTrending}
                onChange={(e) => set("isTrending", e.target.checked)}
                className="w-4 h-4 accent-brand-yellow"
              />
              <span className="text-sm font-bold text-gray-700">
                Trending / Hot
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="yellow" onClick={handleSubmit} loading={saving}>
            {form.id ? "Lưu thay đổi" : "Tạo câu hỏi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Admin role guard
  React.useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Show loading until auth check is complete
  if (!user || user.role !== "admin") {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <p className="text-red-600 font-semibold">
            Bạn không có quyền truy cập trang này
          </p>
        </div>
      </MainLayout>
    );
  }

  const qc = useQueryClient();

  // Filters
  const [skill, setSkill] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // Modal state
  const [modal, setModal] = React.useState<
    null | (FormState & { id?: string })
  >(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const params: Record<string, any> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  if (skill) params.skill = skill;
  if (level) params.level = level;
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", params],
    queryFn: () => questionsApi.list(params),
  });

  const questions: any[] = Array.isArray(data)
    ? data
    : data?.items || data?.data || [];
  const total: number = data?.total ?? questions.length;

  const createMutation = useMutation({
    mutationFn: (payload: any) => questionsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setModal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setModal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setDeleteId(null);
    },
  });

  const openCreate = () => setModal({ ...EMPTY_FORM });
  const openEdit = (q: any) => {
    setModal({
      id: q.id,
      skill: q.skill,
      type: q.type,
      level: q.level || "Medium",
      title: q.title || "",
      content: q.content || "",
      audioUrl: q.audioUrl || "",
      imageUrl: q.imageUrl || "",
      options: q.options ? JSON.stringify(q.options, null, 2) : "",
      correctAnswer: q.correctAnswer
        ? typeof q.correctAnswer === "string"
          ? q.correctAnswer
          : JSON.stringify(q.correctAnswer, null, 2)
        : "",
      isRepeated: q.isRepeated || false,
      isTrending: q.isTrending || false,
    });
  };

  const handleSave = (payload: any) => {
    if (modal?.id) {
      updateMutation.mutate({ id: modal.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F7F6F3]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-lg">
              ⚙️ Admin — Question Bank
            </h1>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {total} câu
            </span>
          </div>
          <Button variant="yellow" size="sm" onClick={openCreate}>
            + Thêm câu hỏi
          </Button>
        </div>

        <div className="px-8 py-6">
          {/* Filters */}
          <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="🔍 Tìm kiếm title, code..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30 w-56"
            />
            <select
              value={skill}
              onChange={(e) => {
                setSkill(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
            >
              <option value="">Tất cả kỹ năng</option>
              {SKILLS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/30"
            >
              <option value="">Tất cả level</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            {(skill || level || search) && (
              <button
                onClick={() => {
                  setSkill("");
                  setLevel("");
                  setSearch("");
                  setPage(1);
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-bold text-gray-500">Không có câu hỏi nào</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Skill / Type
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Title / Content
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Flags
                    </th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {questions.map((q: any) => (
                    <tr
                      key={q.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">
                          {q.code}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs font-bold text-gray-800">
                          {q.skill}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {q.type} ·{" "}
                          {QUESTION_TYPE_LABELS[q.type as QuestionType] ||
                            q.type}
                        </div>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {q.title || (
                            <span className="text-gray-400 italic">
                              No title
                            </span>
                          )}
                        </p>
                        {q.content && (
                          <p className="text-[11px] text-gray-400 truncate">
                            {q.content.substring(0, 60)}...
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded",
                            q.level === "Easy"
                              ? "bg-green-100 text-green-700"
                              : q.level === "Hard"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600",
                          )}
                        >
                          {q.level}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {q.isRepeated && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-pink-500 text-white rounded">
                              RPT
                            </span>
                          )}
                          {q.isTrending && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-brand-yellow text-brand-black rounded">
                              HOT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(q)}
                            className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => setDeleteId(q.id)}
                            className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </Button>
              <span className="text-sm font-bold text-gray-500">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <QuestionModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={isSaving}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="font-display font-black text-lg mb-2">
              Xóa câu hỏi?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setDeleteId(null)}
              >
                Hủy
              </Button>
              <Button
                variant="dark"
                className="flex-1"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
