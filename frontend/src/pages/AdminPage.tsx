import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Settings2, Users, ClipboardList, Search, Crown,
  CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight,
  Shield, UserCheck, CreditCard, XCircle, RefreshCw,
  BarChart3, TrendingUp, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import { questionsApi, adminApi, paymentsApi } from "../api";
import { useAuthStore } from "../stores/authStore";
import { MainLayout } from "../components/layout/Sidebar";
import { Button } from "../components/ui";
import { QUESTION_TYPE_LABELS, QuestionType, SKILL_TYPES } from "../types";
import { LUX } from "../theme/luxuryPalette";

const GOLD = LUX.gold;
const GOLD_B = LUX.goldBright;

const SKILLS = ["SPEAKING", "WRITING", "READING", "LISTENING"];
const LEVELS = ["Easy", "Medium", "Hard"];

const EMPTY_FORM = {
  code: "",
  skill: "SPEAKING",
  type: "SPEAKING_READ_ALOUD" as QuestionType,
  level: "Medium",
  title: "",
  content: "",
  audioUrl: "",
  imageUrl: "",
  options: "",
  correctAnswer: "",
  suggestedAnswer: "",
  tips: "",
  prepTime: "35",
  responseTime: "40",
  minWords: "",
  maxWords: "",
  isRepeated: false,
  isTrending: false,
};

type FormState = typeof EMPTY_FORM;
type Tab = "questions" | "users" | "mock-results" | "payments" | "analytics";

// ── JSON textarea ─────────────────────────────────────────────────────────────
function JsonTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [error, setError] = React.useState("");
  const handleChange = (v: string) => {
    onChange(v);
    try { if (v.trim()) JSON.parse(v); setError(""); } catch { setError("JSON không hợp lệ"); }
  };
  return (
    <div>
      <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
      <textarea
        rows={3} value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={clsx("w-full text-xs font-mono border rounded-lg px-3 py-2 focus:outline-none focus:ring-2",
          error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-brand-gold/30")}
        placeholder='e.g. ["Option A", "Option B"] or {"text":"..."}'
      />
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── Question modal ────────────────────────────────────────────────────────────
function QuestionModal({ initial, onClose, onSave, saving }: {
  initial: FormState & { id?: string }; onClose: () => void;
  onSave: (data: any) => void; saving: boolean;
}) {
  const [form, setForm] = React.useState<FormState & { id?: string }>(initial);
  const set = (key: keyof FormState, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const availableTypes = SKILL_TYPES[form.skill as keyof typeof SKILL_TYPES] || [];

  React.useEffect(() => {
    if (!availableTypes.includes(form.type)) set("type", availableTypes[0]);
  }, [form.skill]);

  const handleSubmit = () => {
    if (!form.id && !form.code.trim()) {
      window.alert("Vui lòng nhập mã câu (code), ví dụ RA0099.");
      return;
    }
    const payload: any = { skill: form.skill, type: form.type, level: form.level, isRepeated: form.isRepeated, isTrending: form.isTrending };
    if (form.code.trim()) payload.code = form.code.trim();
    if (form.title.trim()) payload.title = form.title.trim();
    if (form.content.trim()) payload.content = form.content.trim();
    if (form.audioUrl.trim()) payload.audioUrl = form.audioUrl.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.suggestedAnswer.trim()) payload.suggestedAnswer = form.suggestedAnswer.trim();
    if (form.tips.trim()) payload.tips = form.tips.trim();
    const prep = parseInt(String(form.prepTime), 10);
    const resp = parseInt(String(form.responseTime), 10);
    if (!Number.isNaN(prep)) payload.prepTime = prep;
    if (!Number.isNaN(resp)) payload.responseTime = resp;
    if (form.minWords.trim()) {
      const n = parseInt(form.minWords, 10);
      if (!Number.isNaN(n)) payload.minWords = n;
    }
    if (form.maxWords.trim()) {
      const n = parseInt(form.maxWords, 10);
      if (!Number.isNaN(n)) payload.maxWords = n;
    }
    try { if (form.options.trim()) payload.options = JSON.parse(form.options); } catch {}
    try {
      if (form.correctAnswer.trim()) payload.correctAnswer = JSON.parse(form.correctAnswer);
    } catch { if (form.correctAnswer.trim()) payload.correctAnswer = form.correctAnswer.trim(); }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-black text-lg">{form.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Mã câu (code) {form.id ? "" : "*"}</label>
            <input value={form.code} onChange={(e) => set("code", e.target.value)}
              disabled={!!form.id}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 disabled:bg-gray-50"
              placeholder="VD: RA0099 (bắt buộc khi tạo mới)" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Skill *", value: form.skill, options: SKILLS.map((s) => ({ v: s, l: s })), onChange: (v: string) => set("skill", v) },
              { label: "Type *", value: form.type, options: availableTypes.map((t) => ({ v: t, l: `${t} – ${QUESTION_TYPE_LABELS[t]}` })), onChange: (v: string) => set("type", v as QuestionType) },
              { label: "Level *", value: form.level, options: LEVELS.map((l) => ({ v: l, l })), onChange: (v: string) => set("level", v) },
            ].map(({ label, value, options, onChange }) => (
              <div key={label}>
                <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
                <select value={value} onChange={(e) => onChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30">
                  {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              placeholder="Tiêu đề câu hỏi (tuỳ chọn)" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Content / Passage</label>
            <textarea rows={4} value={form.content} onChange={(e) => set("content", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-y"
              placeholder="Nội dung đoạn văn, câu hỏi..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Audio URL", key: "audioUrl" as keyof FormState, ph: "/uploads/audio/..." }, { label: "Image URL", key: "imageUrl" as keyof FormState, ph: "https://..." }].map(({ label, key, ph }) => (
              <div key={key}>
                <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
                <input value={form[key] as string} onChange={(e) => set(key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                  placeholder={ph} />
              </div>
            ))}
          </div>
          <JsonTextarea label="Options (JSON)" value={form.options} onChange={(v) => set("options", v)} />
          <JsonTextarea label="Correct Answer (JSON or string)" value={form.correctAnswer} onChange={(v) => set("correctAnswer", v)} />
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Suggested answer / transcript mẫu</label>
            <textarea rows={2} value={form.suggestedAnswer} onChange={(e) => set("suggestedAnswer", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-y" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Tips / hướng dẫn</label>
            <textarea rows={2} value={form.tips} onChange={(e) => set("tips", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-y" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Prep time (s)", key: "prepTime" as const },
              { label: "Response time (s)", key: "responseTime" as const },
              { label: "Min words", key: "minWords" as const },
              { label: "Max words", key: "maxWords" as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
                <input type="text" inputMode="numeric" value={form[key] as string} onChange={(e) => set(key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6">
            {[
              { key: "isRepeated" as keyof FormState, label: "Repeated (đề thi thật)", color: "accent-pink-500" },
              { key: "isTrending" as keyof FormState, label: "Trending / Hot", color: "accent-brand-gold" },
            ].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => set(key, e.target.checked)} className={`w-4 h-4 ${color}`} />
                <span className="text-sm font-bold text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="yellow" onClick={handleSubmit} loading={saving}>{form.id ? "Lưu thay đổi" : "Tạo câu hỏi"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab() {
  const qc = useQueryClient();
  const [skill, setSkill] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [modal, setModal] = React.useState<null | (FormState & { id?: string })>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const PAGE_SIZE = 20;

  const params: Record<string, any> = { limit: PAGE_SIZE, page };
  if (skill) params.skill = skill;
  if (level) params.level = level;
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useQuery({ queryKey: ["admin-questions", params], queryFn: () => questionsApi.list(params) });
  const questions: any[] = Array.isArray(data) ? data : data?.items || data?.data || [];
  const total: number = data?.total ?? questions.length;

  const createMutation = useMutation({ mutationFn: (p: any) => questionsApi.create(p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-questions"] }); setModal(null); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => questionsApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-questions"] }); setModal(null); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => questionsApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-questions"] }); setDeleteId(null); } });

  const openEdit = (q: any) => setModal({
    id: q.id,
    code: q.code || "",
    skill: q.skill, type: q.type, level: q.level || "Medium",
    title: q.title || "", content: q.content || "", audioUrl: q.audioUrl || "", imageUrl: q.imageUrl || "",
    options: q.options ? JSON.stringify(q.options, null, 2) : "",
    correctAnswer: q.correctAnswer ? (typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer, null, 2)) : "",
    suggestedAnswer: q.suggestedAnswer || "",
    tips: q.tips || "",
    prepTime: String(q.prepTime ?? 35),
    responseTime: String(q.responseTime ?? 40),
    minWords: q.minWords != null ? String(q.minWords) : "",
    maxWords: q.maxWords != null ? String(q.maxWords) : "",
    isRepeated: q.isRepeated || false, isTrending: q.isTrending || false,
  });
  const handleSave = (payload: any) => modal?.id ? updateMutation.mutate({ id: modal.id, data: payload }) : createMutation.mutate(payload);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{total} câu hỏi</span>
        <Button variant="yellow" size="sm" onClick={() => setModal({ ...EMPTY_FORM })}>+ Thêm câu hỏi</Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm title, code..."
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 w-56" />
        </div>
        <select value={skill} onChange={(e) => { setSkill(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30">
          <option value="">Tất cả kỹ năng</option>
          {SKILLS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30">
          <option value="">Tất cả level</option>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        {(skill || level || search) && (
          <button onClick={() => { setSkill(""); setLevel(""); setSearch(""); setPage(1); }}
            className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors">
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16"><p className="font-bold text-gray-500">Không có câu hỏi nào</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Code", "Skill / Type", "Title / Content", "Level", "Flags", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {questions.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3"><span className="text-[11px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">{q.code}</span></td>
                  <td className="px-5 py-3">
                    <div className="text-xs font-bold text-gray-800">{q.skill}</div>
                    <div className="text-[10px] text-gray-400">{QUESTION_TYPE_LABELS[q.type as QuestionType] || q.type}</div>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="text-sm font-semibold text-gray-900 truncate">{q.title || <span className="text-gray-400 italic">No title</span>}</p>
                    {q.content && <p className="text-[11px] text-gray-400 truncate">{q.content.substring(0, 60)}...</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded",
                      q.level === "Easy" ? "bg-green-100 text-green-700" : q.level === "Hard" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>
                      {q.level}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {q.isRepeated && <span className="text-[10px] font-black px-1.5 py-0.5 bg-pink-500 text-white rounded">RPT</span>}
                      {q.isTrending && <span className="text-[10px] font-black px-1.5 py-0.5 bg-brand-gold text-white rounded">HOT</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(q)} className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">Sửa</button>
                      <button onClick={() => setDeleteId(q.id)} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></Button>
          <span className="text-sm font-bold text-gray-500">Trang {page} / {totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></Button>
        </div>
      )}

      {modal && <QuestionModal initial={modal} onClose={() => setModal(null)} onSave={handleSave} saving={isSaving} />}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
            <h3 className="font-display font-black text-lg mb-2">Xóa câu hỏi?</h3>
            <p className="text-sm text-gray-500 mb-5">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="dark" className="flex-1" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>Xóa</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Edit user (controlled — lưu plan / role / họ tên) ─────────────────────────
function EditUserModal({
  user,
  onClose,
  saving,
  onSave,
}: {
  user: { id: string; email: string; fullName: string; plan: string; role: string };
  onClose: () => void;
  saving: boolean;
  onSave: (data: { plan?: string; role?: string; fullName?: string }) => void;
}) {
  const [fullName, setFullName] = React.useState(user.fullName || "");
  const [plan, setPlan] = React.useState(user.plan);
  const [role, setRole] = React.useState(user.role);

  React.useEffect(() => {
    setFullName(user.fullName || "");
    setPlan(user.plan);
    setRole(user.role);
  }, [user.id, user.fullName, user.plan, user.role]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="font-display font-black text-lg mb-2">Sửa tài khoản</h3>
        <p className="text-xs text-gray-400 mb-4 break-all">{user.email}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Họ và tên</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button
            variant="yellow"
            className="flex-1"
            loading={saving}
            onClick={() => {
              const fn = fullName.trim();
              if (!fn) {
                window.alert("Họ và tên không được để trống.");
                return;
              }
              onSave({ plan, role, fullName: fn });
            }}
          >
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [editUser, setEditUser] = React.useState<any>(null);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, page, limit: 20 }),
  });

  const { data: mockTests } = useQuery({
    queryKey: ["admin-user-mock-tests", selectedUser?.id],
    queryFn: () => adminApi.getUserMockTests(selectedUser.id),
    enabled: !!selectedUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setEditUser(null); },
  });

  const users: any[] = data?.users || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex gap-5">
      {/* User list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm email hoặc tên..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
          </div>
          <span className="text-xs font-bold text-gray-400">{total} người dùng</span>
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Người dùng", "Plan", "Role", "Thống kê", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id}
                    className={clsx("hover:bg-gray-50 transition-colors cursor-pointer", selectedUser?.id === u.id && "bg-brand-gold/5")}
                    onClick={() => setSelectedUser(u)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                          {u.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{u.fullName}</p>
                          <p className="text-[11px] text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 w-fit",
                        u.plan === "premium" ? "bg-brand-gold/15 text-brand-gold" : "bg-gray-100 text-gray-500")}>
                        <Crown size={9} /> {u.plan === "premium" ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 w-fit",
                        u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500")}>
                        {u.role === "admin" ? <><Shield size={9} /> Admin</> : <><UserCheck size={9} /> User</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      <div>{u.totalAttempts} câu · TB {Math.round(u.averageScore || 0)}/90</div>
                      <div>{u.streakDays} ngày streak</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setEditUser(u); }}
                        className="text-xs font-bold text-brand-gold hover:underline">Sửa</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Không có người dùng nào</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></Button>
            <span className="text-sm font-bold text-gray-500">Trang {page} / {totalPages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></Button>
          </div>
        )}
      </div>

      {/* User detail panel */}
      {selectedUser && (
        <div className="w-80 flex-shrink-0">
          <div className="card p-5 sticky top-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-black text-sm">Lịch sử Mock Test</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
            <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                {selectedUser.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{selectedUser.fullName}</p>
                <p className="text-[11px] text-gray-400">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {!mockTests ? (
                <div className="text-center py-6"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
              ) : mockTests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Chưa làm mock test nào</p>
              ) : mockTests.map((a: any) => (
                <div key={a.id} className="rounded-xl p-3 border border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{a.mockTest?.title || a.mockTestId}</p>
                    <span className={clsx("text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5",
                      a.status === "COMPLETED" ? "bg-green-100 text-green-700" : a.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500")}>
                      {a.status === "COMPLETED" ? <><CheckCircle2 size={8} /> Hoàn thành</> : a.status === "IN_PROGRESS" ? <><Clock size={8} /> Đang làm</> : "Bỏ dở"}
                    </span>
                  </div>
                  {a.totalScore != null && (
                    <p className="text-[11px] text-brand-gold font-black">AI: {Math.round(a.totalScore)}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          saving={updateMutation.isPending}
          onSave={(data) => updateMutation.mutate({ id: editUser.id, data })}
        />
      )}
    </div>
  );
}

// ── Mock Results Tab ──────────────────────────────────────────────────────────
function MockResultsTab() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-results", search, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, page, limit: 10 }),
  });

  const users: any[] = data?.users || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const [expanded, setExpanded] = React.useState<string | null>(null);
  const { data: userMockTests } = useQuery({
    queryKey: ["admin-user-mock-tests-results", expanded],
    queryFn: () => adminApi.getUserMockTests(expanded!),
    enabled: !!expanded,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm học viên..."
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 w-64" />
        </div>
        <span className="text-xs font-bold text-gray-400">{total} học viên</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="card flex justify-center py-12"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
        ) : users.map((u: any) => (
          <div key={u.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                {u.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{u.fullName}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-black text-gray-900">{u.totalAttempts}</p>
                  <p className="text-[10px] text-gray-400">câu đã làm</p>
                </div>
                <div className="text-center">
                  <p className="font-black" style={{ color: GOLD }}>{Math.round(u.averageScore || 0)}</p>
                  <p className="text-[10px] text-gray-400">điểm TB</p>
                </div>
                <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-md",
                  u.plan === "premium" ? "bg-brand-gold/15 text-brand-gold" : "bg-gray-100 text-gray-500")}>
                  {u.plan === "premium" ? "Premium" : "Free"}
                </span>
                <ChevronRight size={14} className={clsx("text-gray-400 transition-transform", expanded === u.id && "rotate-90")} />
              </div>
            </button>

            {expanded === u.id && (
              <div className="border-t border-gray-100 px-5 py-4">
                {!userMockTests ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
                ) : userMockTests.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Học viên này chưa làm mock test nào</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {userMockTests.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{a.mockTest?.title || a.mockTestId}</p>
                          <p className="text-[11px] text-gray-400">{new Date(a.createdAt).toLocaleDateString("vi-VN")}</p>
                        </div>
                        <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1",
                          a.status === "COMPLETED" ? "bg-green-100 text-green-700" : a.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500")}>
                          {a.status === "COMPLETED" ? <><CheckCircle2 size={9} /> Hoàn thành</> : a.status === "IN_PROGRESS" ? <><Clock size={9} /> Đang làm</> : "Bỏ dở"}
                        </span>
                        {a.totalScore != null && (
                          <div className="text-right">
                            <p className="font-black text-sm" style={{ color: GOLD }}>AI: {Math.round(a.totalScore)}</p>
                            {a.sectionScores && (
                              <p className="text-[10px] text-gray-400">
                                S:{Math.round(a.sectionScores.speaking||0)} W:{Math.round(a.sectionScores.writing||0)} R:{Math.round(a.sectionScores.reading||0)} L:{Math.round(a.sectionScores.listening||0)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></Button>
          <span className="text-sm font-bold text-gray-500">Trang {page} / {totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></Button>
        </div>
      )}
    </div>
  );
}

// ── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const qc = useQueryClient();
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: paymentsApi.adminListAll,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.adminVerify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments"] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.adminReject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments"] }),
  });

  const list: any[] = payments || [];
  const pending   = list.filter((p) => p.status === "pending");
  const processed = list.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending payments */}
      <div>
        <h3 className="font-display font-black text-sm mb-3 flex items-center gap-2">
          <RefreshCw size={13} className="text-amber-500" />
          Chờ xác nhận
          {pending.length > 0 && (
            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </h3>
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} />
            </div>
          ) : pending.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Không có đơn nào đang chờ</p>
          ) : pending.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                   style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                {p.user?.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{p.user?.fullName || p.userId}</p>
                <p className="text-[11px] text-gray-400">{p.user?.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] font-bold text-brand-gold">Premium {p.planName}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{p.transferContent}</span>
                  <span className="text-[11px] text-gray-500">{(p.amountVnd / 1000).toFixed(0)}K đ</span>
                </div>
              </div>
              <div className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => verifyMutation.mutate(p.id)}
                  disabled={verifyMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50">
                  <CheckCircle2 size={12} /> Xác nhận
                </button>
                <button
                  onClick={() => rejectMutation.mutate(p.id)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                  <XCircle size={12} /> Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Processed payments */}
      {processed.length > 0 && (
        <div>
          <h3 className="font-display font-black text-sm mb-3 flex items-center gap-2">
            <Clock size={13} className="text-gray-400" /> Lịch sử xử lý
          </h3>
          <div className="card overflow-hidden">
            {processed.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800">{p.user?.fullName || p.userId}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Premium {p.planName} · <span className="font-mono">{p.transferContent}</span> · {(p.amountVnd / 1000).toFixed(0)}K đ
                  </p>
                </div>
                <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1",
                  p.status === "verified" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                  {p.status === "verified" ? <><CheckCircle2 size={9} /> Đã xác nhận</> : <><XCircle size={9} /> Từ chối</>}
                </span>
                <span className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const SKILL_COLORS: Record<string, string> = {
  SPEAKING: "#f59e0b", WRITING: "#3b82f6", READING: "#10b981", LISTENING: "#8b5cf6",
};
const SKILL_BG: Record<string, string> = {
  SPEAKING: "bg-amber-100 text-amber-800", WRITING: "bg-blue-100 text-blue-800",
  READING: "bg-green-100 text-green-800", LISTENING: "bg-purple-100 text-purple-800",
};

function SkillBar({ skill, count, max }: { skill: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 truncate">{skill[0] + skill.slice(1).toLowerCase()}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SKILL_COLORS[skill] || "#999" }} />
      </div>
      <span className="w-8 text-right font-bold text-gray-700">{count}</span>
    </div>
  );
}

function AnalyticsTab() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState("lastActive");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [skillFilter, setSkillFilter] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: overview } = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: adminApi.getAnalyticsOverview,
    staleTime: 60000,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-analytics-users", debouncedSearch, page, sortBy, sortOrder, skillFilter, planFilter, activeFilter],
    queryFn: () => adminApi.getAnalyticsUsers({
      search: debouncedSearch || undefined, page, limit: 20,
      sortBy, sortOrder, skill: skillFilter || undefined,
      plan: planFilter || undefined, activeIn: activeFilter || undefined,
    }),
    staleTime: 30000,
  });

  const { data: userActivity } = useQuery({
    queryKey: ["admin-user-activity", expandedId],
    queryFn: () => adminApi.getUserActivity(expandedId!),
    enabled: !!expandedId,
  });

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder(o => o === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortOrder("desc"); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy === col ? (sortOrder === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  const totalPages = Math.ceil((usersData?.total || 0) / 20);
  const maxSkill = usersData?.users
    ? Math.max(...usersData.users.map((u: any) => Math.max(...Object.values(u.skillBreakdown || {}) as number[])), 1)
    : 1;

  const fmtDate = (d?: string) => d
    ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "—";
  const fmtTime = (d?: string) => d
    ? new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : "—";

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Tổng users", value: overview.totalUsers, color: "text-gray-900", icon: "👥" },
            { label: "Premium", value: overview.premiumUsers, color: "text-amber-700", icon: "👑" },
            { label: "Active hôm nay", value: overview.activeToday, color: "text-green-700", icon: "⚡" },
            { label: "Active 7 ngày", value: overview.activeThisWeek, color: "text-blue-700", icon: "📅" },
            { label: "Lượt luyện tập", value: overview.totalAttempts, color: "text-purple-700", icon: "📝" },
            { label: "Mock test hoàn thành", value: overview.totalMockTests, color: "text-green-700", icon: "🎯" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="card px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className={clsx("font-display font-black text-xl", color)}>{(value ?? 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skill popularity */}
      {overview?.bySkill?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">🏅 Kỹ năng được luyện nhiều nhất (30 ngày)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {["SPEAKING", "WRITING", "READING", "LISTENING"].map(skill => {
              const found = overview.bySkill.find((s: any) => s.skill === skill);
              const total30 = overview.bySkill.reduce((s: number, r: any) => s + r.count, 0);
              const cnt = found?.count || 0;
              const pct = total30 > 0 ? Math.round((cnt / total30) * 100) : 0;
              return (
                <div key={skill} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SKILL_COLORS[skill] }} />
                  </div>
                  <p className="font-black text-lg text-gray-900">{cnt.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{skill[0] + skill.slice(1).toLowerCase()} · {pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo email hoặc tên..."
              className="flex-1 text-sm outline-none min-w-0" />
          </div>
          <select value={skillFilter} onChange={e => { setSkillFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
            <option value="">Tất cả kỹ năng</option>
            {["SPEAKING", "WRITING", "READING", "LISTENING"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
            <option value="">Tất cả gói</option>
            <option value="FREE">Free</option>
            <option value="PREMIUM">Premium</option>
          </select>
          <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
            <option value="">Mọi thời gian</option>
            <option value="today">Active hôm nay</option>
            <option value="week">Active 7 ngày</option>
            <option value="month">Active 30 ngày</option>
          </select>
          {(search || skillFilter || planFilter || activeFilter) && (
            <button onClick={() => { setSearch(""); setSkillFilter(""); setPlanFilter(""); setActiveFilter(""); setPage(1); }}
              className="text-xs text-red-500 font-bold px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50">
              Xóa filter
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400 font-medium">{usersData?.total ?? 0} người dùng</span>
        </div>
      </div>

      {/* User table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                <button onClick={() => toggleSort("email")} className="flex items-center gap-1 hover:text-gray-700">
                  Người dùng <SortIcon col="email" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">
                Gói / Vai trò
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                <button onClick={() => toggleSort("totalAttempts")} className="flex items-center gap-1 hover:text-gray-700">
                  Lượt làm <SortIcon col="totalAttempts" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">
                Kỹ năng
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                <button onClick={() => toggleSort("lastActive")} className="flex items-center gap-1 hover:text-gray-700">
                  Hoạt động gần nhất <SortIcon col="lastActive" />
                </button>
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Đang tải...</td></tr>
            ) : !usersData?.users?.length ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Không có dữ liệu</td></tr>
            ) : usersData.users.map((u: any) => (
              <React.Fragment key={u.id}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{u.fullName || "—"}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full",
                      u.plan === "PREMIUM" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500")}>
                      {u.plan}
                    </span>
                    {u.role === "admin" && <span className="ml-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">ADMIN</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-gray-900">{u.totalAttempts} <span className="text-[10px] font-normal text-gray-400">luyện</span></p>
                    {u.mockCount > 0 && <p className="text-[10px] text-purple-600 font-bold">{u.mockCount} mock test</p>}
                    {u.avgScore != null && <p className="text-[10px] text-gray-400">avg {u.avgScore}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-1 w-36">
                      {Object.entries(u.skillBreakdown || {}).map(([skill, cnt]) => (
                        <SkillBar key={skill} skill={skill} count={cnt as number} max={maxSkill} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700">{fmtTime(u.lastActiveAt)}</p>
                    <p className="text-[10px] text-gray-400">Đăng ký: {fmtDate(u.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {expandedId === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedId === u.id && (
                  <tr className="bg-blue-50/40">
                    <td colSpan={6} className="px-6 py-4">
                      {!userActivity ? (
                        <p className="text-xs text-gray-400">Đang tải chi tiết...</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* By question type */}
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">📊 Loại bài luyện tập</p>
                              <div className="space-y-1.5">
                                {userActivity.byType?.slice(0, 10).map((t: any) => (
                                  <div key={t.type} className="flex items-center gap-2 text-xs">
                                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", SKILL_BG[t.skill] || "bg-gray-100 text-gray-600")}>
                                      {t.skill?.[0]}
                                    </span>
                                    <span className="flex-1 text-gray-600 truncate">
                                      {t.type.replace(/_/g, " ").replace(/^SPEAKING |^WRITING |^READING |^LISTENING /, "")}
                                    </span>
                                    <span className="font-bold text-gray-900 shrink-0">{t.count} lần</span>
                                    {t.avgScore != null && <span className="text-gray-400 shrink-0">avg {t.avgScore}</span>}
                                    {t.bestScore != null && <span className="text-green-600 font-bold shrink-0">best {Math.round(t.bestScore)}</span>}
                                  </div>
                                ))}
                                {!userActivity.byType?.length && <p className="text-xs text-gray-400">Chưa có lượt làm</p>}
                              </div>
                            </div>

                            {/* Mock test results */}
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">🎯 Kết quả Mock Test</p>
                              {!userActivity.mockAttempts?.length ? (
                                <p className="text-xs text-gray-400">Chưa làm Mock Test nào</p>
                              ) : (
                                <div className="space-y-2">
                                  {userActivity.mockAttempts.map((m: any) => (
                                    <div key={m.id} className="bg-white rounded-lg border border-gray-100 p-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-gray-800 truncate">{m.testCode} · {m.testTitle}</p>
                                          <p className="text-[10px] text-gray-400">{fmtTime(m.completedAt || m.createdAt)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={clsx("text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                            m.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                            m.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500")}>
                                            {m.status === "COMPLETED" ? "Hoàn thành" : m.status === "IN_PROGRESS" ? "Đang làm" : "Bỏ dở"}
                                          </span>
                                          {m.totalScore != null && (
                                            <p className="text-sm font-black text-brand-gold mt-0.5">{Math.round(m.totalScore)}<span className="text-[10px] text-gray-400">/90</span></p>
                                          )}
                                        </div>
                                      </div>
                                      {m.sectionScores && (
                                        <div className="flex gap-2 mt-1.5 flex-wrap">
                                          {Object.entries(m.sectionScores).map(([sk, sc]) => (
                                            <span key={sk} className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", SKILL_BG[sk.toUpperCase()] || "bg-gray-100 text-gray-500")}>
                                              {sk[0].toUpperCase() + sk.slice(1, 3)}: {Math.round(sc as number)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Recent practice attempts table */}
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">🕐 Lịch sử bài luyện tập gần đây</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left py-1.5 pr-3 font-bold text-gray-400">Kỹ năng</th>
                                    <th className="text-left py-1.5 pr-3 font-bold text-gray-400">Loại bài</th>
                                    <th className="text-left py-1.5 pr-3 font-bold text-gray-400">Mã đề</th>
                                    <th className="text-right py-1.5 pr-3 font-bold text-gray-400">Điểm</th>
                                    <th className="text-right py-1.5 font-bold text-gray-400">Thời gian</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {userActivity.recentAttempts?.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                      <td className="py-1.5 pr-3">
                                        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", SKILL_BG[a.questionSkill] || "bg-gray-100 text-gray-500")}>
                                          {a.questionSkill}
                                        </span>
                                      </td>
                                      <td className="py-1.5 pr-3 text-gray-600 max-w-[140px] truncate">
                                        {a.questionType?.replace(/_/g, " ").replace(/^SPEAKING |^WRITING |^READING |^LISTENING /, "")}
                                      </td>
                                      <td className="py-1.5 pr-3 font-mono text-gray-500">{a.questionCode}</td>
                                      <td className="py-1.5 pr-3 text-right">
                                        {a.totalScore != null
                                          ? <span className="font-black text-gray-900">{Math.round(a.totalScore)}</span>
                                          : <span className="text-gray-300">—</span>}
                                      </td>
                                      <td className="py-1.5 text-right text-gray-400">{fmtTime(a.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {!userActivity.recentAttempts?.length && <p className="text-xs text-gray-400 py-2">Chưa có lượt làm</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{usersData?.total} users · Trang {page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.min(Math.max(page - 2, 1), totalPages - 4) + i;
                return p <= totalPages ? (
                  <button key={p} onClick={() => setPage(p)}
                    className={clsx("w-7 h-7 rounded border text-xs font-bold", p === page ? "bg-brand-gold border-brand-gold text-white" : "border-gray-200 hover:bg-gray-50")}>
                    {p}
                  </button>
                ) : null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = React.useState<Tab>("analytics");

  React.useEffect(() => {
    if (user && user.role !== "admin") navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (!user || user.role !== "admin") {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <p className="text-red-600 font-semibold">Bạn không có quyền truy cập trang này</p>
        </div>
      </MainLayout>
    );
  }

  const { data: adminStats } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.getStats });

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "analytics",    label: "Thống kê",           icon: BarChart3      },
    { key: "questions",    label: "Question Bank",      icon: ClipboardList  },
    { key: "users",        label: "Quản lý tài khoản", icon: Users           },
    { key: "mock-results", label: "Kết quả Mock Test",  icon: Settings2      },
    { key: "payments",     label: "Thanh toán",         icon: CreditCard     },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-brand-cream">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-14 z-20">
          <div className="flex items-center gap-3">
            <Shield size={16} style={{ color: GOLD }} />
            <h1 className="font-display font-black text-lg">Admin Panel</h1>
            {adminStats && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{adminStats.totalUsers} users</span>
                <span className="text-xs font-bold bg-brand-gold/15 text-brand-gold px-2.5 py-1 rounded-lg">{adminStats.premiumUsers} premium</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 px-8">
          <div className="flex gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={clsx("flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-2 transition-all",
                  tab === key ? "border-brand-gold text-brand-gold" : "border-transparent text-gray-500 hover:text-gray-700")}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">
          {tab === "analytics"    && <AnalyticsTab />}
          {tab === "questions"    && <QuestionsTab />}
          {tab === "users"        && <UsersTab />}
          {tab === "mock-results" && <MockResultsTab />}
          {tab === "payments"     && <PaymentsTab />}
        </div>
      </div>
    </MainLayout>
  );
}
