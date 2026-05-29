import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Settings2, Users, ClipboardList, Search, Crown,
  CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight,
  Shield, UserCheck, CreditCard, XCircle, RefreshCw,
  BarChart3, TrendingUp, Activity, ChevronDown, ChevronUp,
  Play, Trash2, Edit3, Save, FileText, Check, UploadCloud,
  Download, BookOpen, AlertOctagon, HelpCircle, Mail, Globe, Sparkles
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
type Tab = "dashboard" | "questions" | "mock-tests" | "ai-scoring" | "users" | "payments" | "system";

// ── JSON Textarea ─────────────────────────────────────────────────────────────
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

// ── Question Modal ────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-black text-lg">{form.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Mã câu (code) {form.id ? "" : "*"}</label>
            <input value={form.code} onChange={(e) => set("code", e.target.value)}
              disabled={!!form.id}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 disabled:bg-gray-50 font-mono font-bold"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 bg-white">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Audio URL</label>
              <div className="flex gap-2">
                <input value={form.audioUrl} onChange={(e) => set("audioUrl", e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                  placeholder="/uploads/audio/..." />
                {form.audioUrl && (
                  <audio controls className="h-9 max-w-[120px] scale-90" src={form.audioUrl} />
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Image URL</label>
              <div className="flex flex-col gap-2">
                <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                  placeholder="https://..." />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="preview" className="h-16 w-auto object-contain rounded-lg border border-gray-200 self-start" />
                )}
              </div>
            </div>
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
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="yellow" onClick={handleSubmit} loading={saving}>{form.id ? "Lưu thay đổi" : "Tạo câu hỏi"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Dashboard ────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.getStats });
  const { data: overview } = useQuery({ queryKey: ["admin-analytics-overview"], queryFn: adminApi.getAnalyticsOverview });
  const { data: payments } = useQuery({ queryKey: ["admin-payments"], queryFn: paymentsApi.adminListAll });

  const totalRevenue = React.useMemo(() => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments
      .filter((p: any) => p.status === "verified")
      .reduce((sum: number, p: any) => sum + (p.amountVnd || 0), 0);
  }, [payments]);

  const activeToday = overview?.activeToday ?? 0;
  const activeThisWeek = overview?.activeThisWeek ?? 0;

  return (
    <div className="space-y-6">
      {/* Top statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Tổng học viên", val: stats?.totalUsers ?? 0, change: "Tài khoản đăng ký", icon: "👥", bg: "bg-blue-50 text-blue-700" },
          { title: "Gói Premium", val: stats?.premiumUsers ?? 0, change: "Đang hoạt động", icon: "👑", bg: "bg-amber-50 text-amber-700" },
          { title: "Doanh thu", val: `${(totalRevenue / 1000000).toFixed(1)}M đ`, change: "Tổng giao dịch thành công", icon: "💳", bg: "bg-green-50 text-green-700" },
          { title: "Lượt làm Mock Test", val: stats?.completedTests ?? 0, change: "Bài thi đã hoàn thành", icon: "📝", bg: "bg-purple-50 text-purple-700" },
        ].map((c) => (
          <div key={c.title} className="card p-5 flex items-center justify-between border border-gray-100 hover:shadow-md transition-all duration-300">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{c.title}</p>
              <h3 className="font-display font-black text-2xl mt-1 text-gray-900">{c.val}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.change}</p>
            </div>
            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold", c.bg)}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly active students indicator */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-display font-black text-sm text-gray-900 flex items-center gap-1.5">
              <Activity size={14} className="text-brand-gold" />
              Biểu đồ tăng trưởng học viên active
            </h3>
            <span className="text-[11px] font-black text-white bg-green-500 px-2 py-0.5 rounded-full">LIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{activeToday}</p>
              <p className="text-xs text-gray-500 mt-1">Đang hoạt động hôm nay</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{activeThisWeek}</p>
              <p className="text-xs text-gray-500 mt-1">Hoạt động trong tuần</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">Hệ thống ghi nhận hoạt động tự động khi học viên tiến hành thực hiện các bài thi/bài luyện tập kỹ năng.</p>
        </div>

        {/* System Error Reports status */}
        <div className="card p-5 space-y-3">
          <h3 className="font-display font-black text-sm text-gray-900 flex items-center gap-1.5">
            <AlertOctagon size={14} className="text-red-500" />
            Báo cáo lỗi từ học viên
          </h3>
          <div className="space-y-2">
            {[
              { desc: "Lỗi âm thanh câu RS0015", status: "Chờ xử lý", color: "bg-red-100 text-red-700" },
              { desc: "Sai chính tả nội dung RA0023", status: "Đang sửa", color: "bg-amber-100 text-amber-700" },
              { desc: "Kết quả chấm AI không cập nhật", status: "Đã xong", color: "bg-green-100 text-green-700" },
            ].map((err, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{err.desc}</span>
                <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded", err.color)}>{err.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Question Bank ────────────────────────────────────────────────────
function QuestionsTab() {
  const qc = useQueryClient();
  const [skill, setSkill] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [modal, setModal] = React.useState<null | (FormState & { id?: string })>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [importText, setImportText] = React.useState("");
  const [showImportModal, setShowImportModal] = React.useState(false);
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

  const handleExport = () => {
    const jsonStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PTE_Questions_Export_${skill || "ALL"}.json`;
    link.click();
  };

  const handleImport = async () => {
    try {
      const list = JSON.parse(importText);
      if (!Array.isArray(list)) {
        window.alert("Dữ liệu JSON phải là một mảng các câu hỏi.");
        return;
      }
      let successCount = 0;
      for (const q of list) {
        await questionsApi.create(q);
        successCount++;
      }
      window.alert(`Đã import thành công ${successCount} câu hỏi!`);
      setShowImportModal(false);
      setImportText("");
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
    } catch (e: any) {
      window.alert("Lỗi phân tích JSON: " + e.message);
    }
  };

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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport} className="flex items-center gap-1">
            <Download size={13} /> Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)} className="flex items-center gap-1">
            <UploadCloud size={13} /> Import JSON
          </Button>
          <Button variant="yellow" size="sm" onClick={() => setModal({ ...EMPTY_FORM })} className="flex items-center gap-1">
            + Thêm câu hỏi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center bg-white">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm title, code..."
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 w-56" />
        </div>
        <select value={skill} onChange={(e) => { setSkill(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 bg-white">
          <option value="">Tất cả kỹ năng</option>
          {SKILLS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 bg-white">
          <option value="">Tất cả level</option>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        {(skill || level || search) && (
          <button onClick={() => { setSkill(""); setLevel(""); setSearch(""); setPage(1); }}
            className="text-xs font-bold text-red-500 hover:underline transition-all">
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card overflow-hidden bg-white">
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

      {/* JSON Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col">
            <h3 className="font-display font-black text-lg mb-3">Nhập câu hỏi hàng loạt (Import JSON)</h3>
            <p className="text-xs text-gray-400 mb-3">Dán mảng các câu hỏi định dạng JSON vào đây. Hệ thống sẽ tự động tạo hàng loạt.</p>
            <textarea rows={10} value={importText} onChange={(e) => setImportText(e.target.value)}
              className="w-full text-xs font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 mb-4"
              placeholder='[ { "code": "RA001", "skill": "SPEAKING", "type": "SPEAKING_READ_ALOUD", "title": "...", "content": "..." } ]' />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>Hủy</Button>
              <Button variant="yellow" onClick={handleImport} disabled={!importText.trim()}>Import Dữ liệu</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tab 3: Mock Test Management ─────────────────────────────────────────────
function MockTestsTab() {
  const qc = useQueryClient();
  const { data: mockTests, isLoading } = useQuery({ queryKey: ["admin-mock-tests"], queryFn: adminApi.listMockTests });
  const { data: allQuestionsData } = useQuery({ queryKey: ["admin-all-questions"], queryFn: () => questionsApi.list({ limit: 1000 }) });
  
  const allQuestions = React.useMemo(() => {
    if (!allQuestionsData) return [];
    return Array.isArray(allQuestionsData) ? allQuestionsData : allQuestionsData.items || allQuestionsData.data || [];
  }, [allQuestionsData]);

  const [editMock, setEditMock] = React.useState<any>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const createMutation = useMutation({ mutationFn: (d: any) => adminApi.createMockTest(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-mock-tests"] }); setEditMock(null); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateMockTest(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-mock-tests"] }); setEditMock(null); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => adminApi.deleteMockTest(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-mock-tests"] }); setDeleteId(null); } });

  const openNew = () => setEditMock({ code: "", title: "", description: "", durationMinutes: 120, isActive: true, sections: { speaking: [], writing: [], reading: [], listening: [] } });

  const handleSave = (data: any) => {
    if (!data.code.trim() || !data.title.trim()) {
      window.alert("Mã đề thi và tiêu đề không được để trống!");
      return;
    }
    if (editMock.id) {
      updateMutation.mutate({ id: editMock.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Đề thi Mock Test</h3>
        <Button variant="yellow" size="sm" onClick={openNew}>+ Tạo Đề thi mới</Button>
      </div>

      <div className="card overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
        ) : !mockTests || mockTests.length === 0 ? (
          <p className="text-center text-gray-500 py-12 font-bold">Chưa có đề thi Mock Test nào</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Mã đề", "Tên đề thi", "Speaking", "Writing", "Reading", "Listening", "Thời gian", "Trạng thái", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockTests.map((mt: any) => (
                <tr key={mt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">{mt.code}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{mt.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(mt.sections?.speaking || []).length} câu</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(mt.sections?.writing || []).length} câu</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(mt.sections?.reading || []).length} câu</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(mt.sections?.listening || []).length} câu</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-600">{mt.durationMinutes} phút</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded",
                      mt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {mt.isActive ? "Active" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditMock(mt)} className="text-xs font-bold text-blue-500 hover:underline">Sửa</button>
                      <button onClick={() => setDeleteId(mt.id)} className="text-xs font-bold text-red-400 hover:underline">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editMock && (
        <MockTestModal mock={editMock} allQuestions={allQuestions} onClose={() => setEditMock(null)} onSave={handleSave} saving={createMutation.isPending || updateMutation.isPending} />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
            <h3 className="font-display font-black text-lg mb-2">Xóa đề thi này?</h3>
            <p className="text-sm text-gray-500 mb-5">Học viên sẽ không thể làm đề thi này nữa.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="dark" className="flex-1" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>Xóa</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mock Test Create/Edit Modal ────────────────────────────────────────────
function MockTestModal({ mock, allQuestions, onClose, onSave, saving }: {
  mock: any; allQuestions: any[]; onClose: () => void; onSave: (d: any) => void; saving: boolean;
}) {
  const [code, setCode] = React.useState(mock.code || "");
  const [title, setTitle] = React.useState(mock.title || "");
  const [description, setDescription] = React.useState(mock.description || "");
  const [durationMinutes, setDurationMinutes] = React.useState(mock.durationMinutes ?? 120);
  const [isActive, setIsActive] = React.useState(mock.isActive ?? true);
  const [sections, setSections] = React.useState(mock.sections || { speaking: [], writing: [], reading: [], listening: [] });

  const toggleQuestion = (skill: string, qid: string) => {
    const s = skill.toLowerCase() as "speaking" | "writing" | "reading" | "listening";
    const current = sections[s] || [];
    const updated = current.includes(qid) ? current.filter((id: string) => id !== qid) : [...current, qid];
    setSections({ ...sections, [s]: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-black text-lg">{mock.id ? "Cập nhật Mock Test" : "Tạo Mock Test mới"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Mã đề (code) *</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} disabled={!!mock.id}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 font-mono font-bold" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Tiêu đề *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Mô tả đề thi</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Thời gian thi (phút)</label>
              <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-gold" />
              <span className="text-sm font-bold text-gray-700">Hiển thị trong danh sách thi</span>
            </label>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Chọn câu hỏi cho từng kỹ năng</h4>
            {SKILLS.map((sk) => {
              const skillKey = sk.toLowerCase() as "speaking" | "writing" | "reading" | "listening";
              const skQuestions = allQuestions.filter((q) => q.skill === sk);
              const selectedIds = sections[skillKey] || [];
              return (
                <div key={sk} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <h5 className="text-xs font-bold text-brand-gold mb-2">{sk} ({selectedIds.length} đã chọn)</h5>
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-white border border-gray-100 rounded-lg p-2">
                    {skQuestions.map((q) => (
                      <label key={q.id} className="flex items-center gap-2 text-xs py-1 px-1.5 hover:bg-gray-50 rounded cursor-pointer select-none">
                        <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleQuestion(sk, q.id)} className="w-3.5 h-3.5 accent-brand-gold rounded" />
                        <span className="font-mono text-gray-400 font-bold shrink-0">{q.code}</span>
                        <span className="text-gray-700 truncate">{q.title || q.content?.substring(0, 30)}</span>
                      </label>
                    ))}
                    {skQuestions.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Không tìm thấy câu hỏi {sk}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="yellow" onClick={() => onSave({ code, title, description, durationMinutes, isActive, sections })} loading={saving}>
            Lưu lại
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: AI Scoring & Manual Override ─────────────────────────────────────
function AiScoringTab() {
  const qc = useQueryClient();
  // Simulated AI API configurations
  const [sttUrl, setSttUrl] = React.useState(localStorage.getItem("ai_stt_url") || "https://api.openai.com/v1/audio/transcriptions");
  const [nlpKey, setNlpKey] = React.useState(localStorage.getItem("ai_nlp_key") || "sk-********************");
  const [weights, setWeights] = React.useState(localStorage.getItem("ai_weights") || '{"content": 0.4, "grammar": 0.4, "vocabulary": 0.2}');

  const handleSaveConfig = () => {
    localStorage.setItem("ai_stt_url", sttUrl);
    localStorage.setItem("ai_nlp_key", nlpKey);
    localStorage.setItem("ai_weights", weights);
    window.alert("Đã lưu cấu hình API AI!");
  };

  // Load all mock test attempts in system
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-analytics-users", "", 1, "lastActive", "desc"],
    queryFn: () => adminApi.getAnalyticsUsers({ page: 1, limit: 100, sortBy: "lastActive", sortOrder: "desc" }),
  });

  const [reviewAttempt, setReviewAttempt] = React.useState<any>(null);
  const [overrideScore, setOverrideScore] = React.useState(50);
  const [overrideSpeaking, setOverrideSpeaking] = React.useState(50);
  const [overrideWriting, setOverrideWriting] = React.useState(50);
  const [overrideReading, setOverrideReading] = React.useState(50);
  const [overrideListening, setOverrideListening] = React.useState(50);

  const overrideMutation = useMutation({
    mutationFn: ({ attemptId, data }: { attemptId: string; data: any }) => adminApi.overrideAttemptScore(attemptId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-analytics-users"] });
      window.alert("Đã sửa điểm thủ công thành công!");
      setReviewAttempt(null);
    }
  });

  const attemptsList = React.useMemo(() => {
    if (!usersData?.users) return [];
    // Flatten mockAttempts from all users
    const all: any[] = [];
    usersData.users.forEach((u: any) => {
      if (u.mockAttempts && Array.isArray(u.mockAttempts)) {
        u.mockAttempts.forEach((m: any) => {
          all.push({ ...m, userEmail: u.email, userFullName: u.fullName });
        });
      }
    });
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [usersData]);

  const openReview = (a: any) => {
    setReviewAttempt(a);
    setOverrideScore(Math.round(a.totalScore ?? 50));
    setOverrideSpeaking(Math.round(a.sectionScores?.speaking ?? 50));
    setOverrideWriting(Math.round(a.sectionScores?.writing ?? 50));
    setOverrideReading(Math.round(a.sectionScores?.reading ?? 50));
    setOverrideListening(Math.round(a.sectionScores?.listening ?? 50));
  };

  const handlePrintPdf = (a: any) => {
    // Generate simple and elegant printable layout matching official scorecard
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Pearson PTE Score Card - ${a.userFullName}</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; color: #333; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #e4a808; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #111; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
            .meta { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .meta-item { background: #fcfcfc; border: 1px solid #eee; padding: 15px; rounded: 10px; }
            .meta-item label { font-size: 11px; font-weight: bold; color: #999; text-transform: uppercase; }
            .meta-item div { font-size: 16px; font-weight: bold; margin-top: 5px; }
            .score-container { text-align: center; margin-bottom: 45px; }
            .overall-score { font-size: 72px; font-weight: 900; color: #e4a808; line-height: 1; }
            .overall-label { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; margin-top: 10px; }
            .section-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .section-card { border: 1px solid #eaeaea; padding: 15px; border-radius: 8px; }
            .section-title { font-size: 13px; font-weight: bold; color: #444; }
            .section-bar { background: #f0f0f0; height: 10px; border-radius: 5px; margin-top: 10px; overflow: hidden; }
            .section-fill { background: #e4a808; height: 100%; }
            .section-score { float: right; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1>Pearson Test of English Academic</h1>
            <p>BẢNG ĐIỂM THI THỬ THỰC TẾ (MOCK TEST REPORT)</p>
          </div>
          <div class="meta">
            <div class="meta-item">
              <label>Họ và Tên</label>
              <div>${a.userFullName}</div>
            </div>
            <div class="meta-item">
              <label>Email học viên</label>
              <div>${a.userEmail}</div>
            </div>
            <div class="meta-item">
              <label>Mã bài thi</label>
              <div>${a.testCode} - ${a.testTitle}</div>
            </div>
            <div class="meta-item">
              <label>Ngày hoàn thành</label>
              <div>${new Date(a.completedAt || a.createdAt).toLocaleDateString("vi-VN")}</div>
            </div>
          </div>

          <div class="score-container">
            <div class="overall-score">${Math.round(a.totalScore ?? 0)}</div>
            <div class="overall-label">Điểm số Tổng hợp (Overall Score)</div>
          </div>

          <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Điểm số thành phần</h3>
          <div class="section-grid">
            ${[
              { n: "Speaking", s: a.sectionScores?.speaking ?? 0 },
              { n: "Writing", s: a.sectionScores?.writing ?? 0 },
              { n: "Reading", s: a.sectionScores?.reading ?? 0 },
              { n: "Listening", s: a.sectionScores?.listening ?? 0 },
            ].map(sec => `
              <div class="section-card">
                <span class="section-title">${sec.n}</span>
                <span class="section-score">${Math.round(sec.s)}/90</span>
                <div class="section-bar">
                  <div class="section-fill" style="width: ${(sec.s / 90) * 100}%"></div>
                </div>
              </div>
            `).join("")}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* AI Config */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card p-5 space-y-4 bg-white">
          <h3 className="font-display font-black text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-gold" />
            Cấu hình AI Scoring API
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Speech-to-Text Endpoint URL</label>
            <input value={sttUrl} onChange={(e) => setSttUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">NLP Grammar Evaluation Token</label>
            <input type="password" value={nlpKey} onChange={(e) => setNlpKey(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Grading Weights (JSON)</label>
            <textarea rows={3} value={weights} onChange={(e) => setWeights(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
          </div>
          <Button variant="yellow" size="sm" onClick={handleSaveConfig} className="w-full">
            Lưu Cấu Hình AI
          </Button>
        </div>
      </div>

      {/* Attempts Review */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Danh sách bài Mock Test đã làm</h3>
        <div className="card bg-white overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
          ) : attemptsList.length === 0 ? (
            <p className="text-center py-12 text-gray-400 font-bold">Chưa có bài nộp nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Học viên", "Mã đề", "Ngày làm", "Điểm AI", "Kỹ năng", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attemptsList.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-xs">{a.userFullName}</p>
                      <p className="text-[10px] text-gray-400">{a.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{a.testCode}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(a.completedAt || a.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      {a.totalScore != null ? (
                        <span className="font-black text-brand-gold text-xs">{Math.round(a.totalScore)}/90</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-bold">Đang chấm</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-400">
                      S:{Math.round(a.sectionScores?.speaking ?? 0)} W:{Math.round(a.sectionScores?.writing ?? 0)} R:{Math.round(a.sectionScores?.reading ?? 0)} L:{Math.round(a.sectionScores?.listening ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openReview(a)} className="text-xs font-bold text-brand-gold hover:underline">Sửa Điểm</button>
                        <button onClick={() => handlePrintPdf(a)} className="text-xs font-bold text-gray-500 hover:underline flex items-center gap-0.5">
                          <FileText size={10} /> In PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review & Manual Override Modal */}
      {reviewAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-display font-black text-base">{reviewAttempt.userFullName}</h3>
                <p className="text-xs text-gray-400">{reviewAttempt.testCode} - {reviewAttempt.testTitle}</p>
              </div>
              <button onClick={() => setReviewAttempt(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Thay đổi điểm thủ công</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {[
                  { label: "Tổng hợp", val: overrideScore, set: setOverrideScore },
                  { label: "Speaking", val: overrideSpeaking, set: setOverrideSpeaking },
                  { label: "Writing", val: overrideWriting, set: setOverrideWriting },
                  { label: "Reading", val: overrideReading, set: setOverrideReading },
                  { label: "Listening", val: overrideListening, set: setOverrideListening },
                ].map((s) => (
                  <div key={s.label}>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">{s.label}</label>
                    <input type="number" min="10" max="90" value={s.val} onChange={(e) => s.set(Math.min(90, Math.max(10, parseInt(e.target.value) || 0)))}
                      className="w-full text-center border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-800" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 italic">Thang điểm chuẩn PTE quy định từ 10 đến 90 điểm.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <Button variant="ghost" onClick={() => setReviewAttempt(null)}>Hủy</Button>
              <Button variant="yellow" loading={overrideMutation.isPending}
                onClick={() => overrideMutation.mutate({
                  attemptId: reviewAttempt.id,
                  data: {
                    totalScore: overrideScore,
                    sectionScores: {
                      speaking: overrideSpeaking,
                      writing: overrideWriting,
                      reading: overrideReading,
                      listening: overrideListening,
                    }
                  }
                })}>
                Cập nhật điểm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 5: User Management ──────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [editUser, setEditUser] = React.useState<any>(null);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);

  // Homework state
  const [assignMockId, setAssignMockId] = React.useState("");
  const [deadline, setDeadline] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, page, limit: 20 }),
  });

  const { data: mockTests } = useQuery({
    queryKey: ["admin-mock-tests-list"],
    queryFn: adminApi.listMockTests,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setEditUser(null); },
  });

  const users: any[] = data?.users || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleAssignHomework = () => {
    if (!assignMockId || !deadline) {
      window.alert("Vui lòng chọn bài thi và hạn chót!");
      return;
    }
    const log = JSON.parse(localStorage.getItem("homework_assignments") || "[]");
    log.push({
      userId: selectedUser.id,
      userFullName: selectedUser.fullName,
      mockId: assignMockId,
      mockTitle: mockTests.find((m: any) => m.id === assignMockId)?.title || assignMockId,
      deadline,
      assignedAt: new Date().toISOString(),
    });
    localStorage.setItem("homework_assignments", JSON.stringify(log));
    window.alert(`Đã giao bài tập thành công cho ${selectedUser.fullName}!`);
    setAssignMockId("");
    setDeadline("");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* User list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm email hoặc tên..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
          </div>
          <span className="text-xs font-bold text-gray-400">{total} người dùng</span>
        </div>

        <div className="card overflow-hidden bg-white">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Người dùng", "Plan", "Role", "Trạng thái", "Thống kê", "Action"].map((h) => (
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
                          <p className="text-[11px] text-gray-400 font-mono">{u.email}</p>
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
                        u.role === "admin" ? "bg-red-100 text-red-700" : u.role === "teacher" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500")}>
                        {u.role === "admin" ? "Admin" : u.role === "teacher" ? "Teacher" : "Student"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-md w-fit block",
                        u.isActive !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {u.isActive !== false ? "Kích hoạt" : "Bị khóa"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      <div>{u.totalAttempts} câu · TB {Math.round(u.averageScore || 0)}/90</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setEditUser(u); }}
                        className="text-xs font-bold text-brand-gold hover:underline">Sửa</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Không có người dùng nào</td></tr>
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

      {/* Right panel: User detail & Homework assigner */}
      {selectedUser && (
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="card p-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-black text-sm">Giao bài tập</h3>
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

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Chọn đề thi</label>
                <select value={assignMockId} onChange={(e) => setAssignMockId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/30 bg-white">
                  <option value="">-- Chọn đề mock test --</option>
                  {mockTests?.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.code} - {m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Hạn chót làm bài</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
              </div>
              <Button variant="yellow" size="sm" onClick={handleAssignHomework} disabled={!assignMockId} className="w-full">
                Xác nhận giao bài
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal (Reset password, Role, Block account) */}
      {editUser && (
        <EditUserDialog user={editUser} onClose={() => setEditUser(null)} saving={updateMutation.isPending} onSave={(data) => updateMutation.mutate({ id: editUser.id, data })} />
      )}
    </div>
  );
}

// ── Edit User Dialog ────────────────────────────────────────────────────────
function EditUserDialog({ user, onClose, saving, onSave }: {
  user: any; onClose: () => void; saving: boolean; onSave: (d: any) => void;
}) {
  const [fullName, setFullName] = React.useState(user.fullName || "");
  const [plan, setPlan] = React.useState(user.plan || "free");
  const [role, setRole] = React.useState(user.role || "user");
  const [isActive, setIsActive] = React.useState(user.isActive ?? true);
  const [password, setPassword] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="font-display font-black text-lg mb-2">Chỉnh sửa tài khoản</h3>
        <p className="text-xs text-gray-400 mb-4 break-all font-mono">{user.email}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Họ và tên</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Gói cước</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Quyền hạn</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="user">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Đổi mật khẩu mới</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder:text-gray-300"
              placeholder="Để trống nếu không muốn đổi" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-gold" />
            <span className="text-sm font-bold text-gray-700">Tài khoản kích hoạt (Active)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button variant="yellow" className="flex-1" loading={saving}
            onClick={() => onSave({ fullName, plan, role, isActive, password: password.trim() ? password : undefined })}>
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 6: Gói cước & Tài chính ─────────────────────────────────────────────
function PaymentsTab() {
  const qc = useQueryClient();
  const { data: payments, isLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: paymentsApi.adminListAll });

  const verifyMutation = useMutation({ mutationFn: (id: string) => paymentsApi.adminVerify(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments"] }) });
  const rejectMutation = useMutation({ mutationFn: (id: string) => paymentsApi.adminReject(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments"] }) });

  const list: any[] = payments || [];
  const pending   = list.filter((p) => p.status === "pending");
  const processed = list.filter((p) => p.status !== "pending");

  // Coupons Manager
  const [coupons, setCoupons] = React.useState<any[]>(JSON.parse(localStorage.getItem("admin_coupons") || "[]"));
  const [newCouponCode, setNewCouponCode] = React.useState("");
  const [newCouponDisc, setNewCouponDisc] = React.useState(20);

  const handleCreateCoupon = () => {
    if (!newCouponCode.trim()) return;
    const updated = [...coupons, { code: newCouponCode.toUpperCase().trim(), discount: newCouponDisc, active: true }];
    setCoupons(updated);
    localStorage.setItem("admin_coupons", JSON.stringify(updated));
    setNewCouponCode("");
  };

  const handleToggleCoupon = (index: number) => {
    const updated = [...coupons];
    updated[index].active = !updated[index].active;
    setCoupons(updated);
    localStorage.setItem("admin_coupons", JSON.stringify(updated));
  };

  const handleDeleteCoupon = (index: number) => {
    const updated = coupons.filter((_, i) => i !== index);
    setCoupons(updated);
    localStorage.setItem("admin_coupons", JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-black text-sm mb-3 flex items-center gap-2 text-gray-900">
            <RefreshCw size={13} className="text-amber-500" />
            Giao dịch chờ xác nhận
            {pending.length > 0 && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>
            )}
          </h3>
          <div className="card overflow-hidden bg-white">
            {isLoading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} /></div>
            ) : pending.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Không có đơn nào đang chờ duyệt</p>
            ) : pending.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-amber-50/20 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                     style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                  {p.user?.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{p.user?.fullName || p.userId}</p>
                  <p className="text-[11px] text-gray-400">{p.user?.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-bold text-brand-gold">Premium {p.planName}</span>
                    <span className="text-[11px] text-gray-500">{(p.amountVnd / 1000).toFixed(0)}K đ</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => verifyMutation.mutate(p.id)} disabled={verifyMutation.isPending}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                    Duyệt
                  </button>
                  <button onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>

          {processed.length > 0 && (
            <div>
              <h3 className="font-display font-black text-sm mb-3 text-gray-900">Lịch sử thanh toán</h3>
              <div className="card overflow-hidden bg-white max-h-60 overflow-y-auto">
                {processed.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-bold text-xs text-gray-800">{p.user?.fullName || p.userId}</p>
                      <p className="text-[10px] text-gray-400">Premium {p.planName} · {(p.amountVnd / 1000).toFixed(0)}K đ</p>
                    </div>
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded",
                      p.status === "verified" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                      {p.status === "verified" ? "Thành công" : "Từ chối"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coupons Manager */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 bg-white space-y-4">
            <h3 className="font-display font-black text-sm text-gray-900 border-b border-gray-100 pb-2">Mã Khuyến Mãi (Coupons)</h3>
            <div className="flex gap-2">
              <input value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)}
                placeholder="VD: MAGICAL20" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs uppercase" />
              <input type="number" value={newCouponDisc} onChange={(e) => setNewCouponDisc(parseInt(e.target.value) || 0)}
                className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-xs text-center" />
              <Button variant="yellow" size="sm" onClick={handleCreateCoupon}>+</Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {coupons.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-800">{c.code}</span>
                    <span className="text-[10px] text-green-600 ml-2 font-bold font-bold">-{c.discount}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleCoupon(i)} className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", c.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500")}>
                      {c.active ? "ON" : "OFF"}
                    </button>
                    <button onClick={() => handleDeleteCoupon(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Chưa có mã giảm giá nào</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 7: System Settings & Bug Reports ────────────────────────────────────
function SystemSettingsTab() {
  const [issues, setIssues] = React.useState<any[]>([
    { id: 1, email: "hocvien01@gmail.com", title: "Lỗi âm thanh câu RS0015", type: "Audio error", status: "Chờ xử lý" },
    { id: 2, email: "hocvien02@gmail.com", title: "Sai chính tả nội dung RA0023", type: "Content error", status: "Đang sửa" },
  ]);

  const handleResolveIssue = (id: number) => {
    const updated = issues.map((i) => i.id === id ? { ...i, status: "Đã xong" } : i);
    setIssues(updated);
    window.alert("Đã cập nhật trạng thái lỗi thành Đã xong!");
  };

  // Frontend configs
  const [bannerText, setBannerText] = React.useState("Luyện thi PTE chuẩn Pearson cùng AI thông minh!");
  const [seoTitle, setSeoTitle] = React.useState("Fly PTE - Hệ thống ôn thi PTE AI số 1");
  const [emailTemplate, setEmailTemplate] = React.useState("Chào mừng bạn gia nhập Fly PTE. Hãy bắt đầu ôn tập ngày hôm nay...");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Issues List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Tiếp nhận báo lỗi (Report Issues)</h3>
        <div className="card overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Học viên", "Mô tả lỗi", "Loại", "Trạng thái", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {issues.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-4 py-3 text-xs text-gray-600 font-bold">{i.email}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{i.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{i.type}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded",
                      i.status === "Chờ xử lý" ? "bg-red-100 text-red-700" : i.status === "Đang sửa" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {i.status !== "Đã xong" && (
                      <button onClick={() => handleResolveIssue(i.id)} className="text-xs font-bold text-green-600 hover:underline">Hoàn thành</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* General config & SEO */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card p-5 bg-white space-y-4">
          <h3 className="font-display font-black text-sm text-gray-900 border-b border-gray-100 pb-2">Cài Đặt Hệ Thống</h3>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Banner trang chủ</label>
            <input value={bannerText} onChange={(e) => setBannerText(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">SEO Title</label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Mẫu Email Chào Mừng</label>
            <textarea rows={4} value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <Button variant="yellow" size="sm" onClick={() => window.alert("Đã cập nhật cài đặt hệ thống!")} className="w-full">
            Lưu Cài Đặt Hệ Thống
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPage Component ───────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = React.useState<Tab>("dashboard");

  React.useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "teacher") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return (
      <MainLayout>
        <div className="p-8 text-center bg-white rounded-2xl max-w-md mx-auto mt-20 border border-gray-100">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-semibold text-lg">Bạn không có quyền truy cập</p>
          <p className="text-xs text-gray-400 mt-1">Trang quản trị chỉ khả dụng đối với Quản trị viên hoặc Giáo viên.</p>
        </div>
      </MainLayout>
    );
  }

  const { data: adminStats } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.getStats });

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "dashboard",    label: "Dashboard",          icon: BarChart3     },
    { key: "questions",    label: "Question Bank",      icon: ClipboardList },
    { key: "mock-tests",   label: "Quản lý Đề thi",     icon: BookOpen      },
    { key: "ai-scoring",   label: "Chấm điểm & AI",     icon: Sparkles      },
    { key: "users",        label: "Người dùng",         icon: Users         },
    { key: "payments",     label: "Gói cước & Tài chính",icon: CreditCard    },
    { key: "system",       label: "Cài đặt & Báo lỗi",  icon: Settings2     },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-brand-cream pb-12">
        {/* Header & Tabs */}
        <div className="bg-white border-b border-gray-100 sticky top-14 z-20 shadow-sm">
          {/* Header */}
          <div className="px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={16} style={{ color: GOLD }} />
              <h1 className="font-display font-black text-lg">Admin Control Center</h1>
              {adminStats && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{adminStats.totalUsers} học viên</span>
                  <span className="text-xs font-bold bg-brand-gold/15 text-brand-gold px-2.5 py-1 rounded-lg">{adminStats.premiumUsers} premium</span>
                </div>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
              Vai trò: {user.role}
            </span>
          </div>

          {/* Tabs Bar */}
          <div className="px-8 overflow-x-auto">
            <div className="flex gap-1 min-w-max pb-0.5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={clsx("flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200",
                    tab === key ? "border-brand-gold text-brand-gold" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50")}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="px-8 py-6 max-w-7xl mx-auto">
          {tab === "dashboard"  && <DashboardTab />}
          {tab === "questions"  && <QuestionsTab />}
          {tab === "mock-tests" && <MockTestsTab />}
          {tab === "ai-scoring" && <AiScoringTab />}
          {tab === "users"      && <UsersTab />}
          {tab === "payments"   && <PaymentsTab />}
          {tab === "system"     && <SystemSettingsTab />}
        </div>
      </div>
    </MainLayout>
  );
}
