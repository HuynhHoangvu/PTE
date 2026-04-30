import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { mockTestApi } from "../../api";
import { MobileHeader } from "../layout/MobileShell";
import { MBadge, MSkeleton, MEmptyState } from "../ui";
import { saveTestOffline, deleteOfflineTest, isTestOffline } from "../../services/offlineStorage";

// ── Pre-test Checklist Modal ──────────────────────────────────────────────────
function PreTestModal({
  test, onStart, onClose,
}: {
  test: { id: string; title: string; durationMinutes: number };
  onStart: () => void;
  onClose: () => void;
}) {
  const [checks, setChecks] = React.useState({ mic: false, charger: false, quiet: false });
  const allChecked = Object.values(checks).every(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
        >
          <p className="text-4xl mb-3">📋</p>
          <h2 className="font-display font-black text-xl text-white">Chuẩn bị thi</h2>
          <p className="text-sm text-white/60 mt-1">{test.title}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <span className="text-lg">⏱</span>
            <span className="font-bold text-white">{test.durationMinutes} phút</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Kiểm tra trước khi thi
          </p>

          {[
            { key: "mic" as const, icon: "🎙️", label: "Microphone hoạt động tốt", sub: "Speaking cần mic ghi âm" },
            { key: "charger" as const, icon: "🔌", label: "Đã cắm sạc điện thoại", sub: `Bài thi kéo dài ${test.durationMinutes} phút` },
            { key: "quiet" as const, icon: "🔇", label: "Môi trường yên tĩnh", sub: "Không có tiếng ồn xung quanh" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setChecks((c) => ({ ...c, [item.key]: !c[item.key] }))}
              className={clsx(
                "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left",
                checks[item.key]
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border-2 transition-all",
                checks[item.key] ? "bg-green-100 border-green-400" : "bg-white border-gray-200"
              )}>
                {checks[item.key] ? "✅" : item.icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Warning */}
        <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700 font-medium">
            ⚠️ Trong khi thi: <strong>không có nút Back</strong>, không thoát app. Timer sẽ chạy liên tục.
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-8 space-y-2.5">
          <button
            onClick={onStart}
            disabled={!allChecked}
            className={clsx(
              "w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97]",
              allChecked
                ? "bg-brand-gold text-white shadow-gold-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {allChecked ? "🚀 Bắt đầu thi ngay" : "Tick đủ 3 mục để bắt đầu"}
          </button>
          <button onClick={onClose} className="w-full text-sm text-gray-400 active:opacity-70">
            Hủy, để sau
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MMockTestPage() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<"library" | "history">("library");
  const [preTest, setPreTest] = React.useState<{ id: string; title: string; durationMinutes: number } | null>(null);
  const [offlineMap, setOfflineMap] = React.useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["mockTests"],
    queryFn: mockTestApi.list,
  });

  React.useEffect(() => {
    if (!tests) return;
    Promise.all((tests as any[]).map((mt: any) =>
      isTestOffline(mt.id).then((ok) => ({ id: mt.id, ok }))
    )).then((results) => {
      const map: Record<string, boolean> = {};
      results.forEach(({ id, ok }) => { map[id] = ok; });
      setOfflineMap(map);
    });
  }, [tests]);

  const handleDownload = async (mt: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (offlineMap[mt.id]) {
      await deleteOfflineTest(mt.id);
      setOfflineMap((m) => ({ ...m, [mt.id]: false }));
      return;
    }
    setDownloading(mt.id);
    try {
      // Save the test metadata offline (questions fetched on demand when online)
      await saveTestOffline(mt, []);
      setOfflineMap((m) => ({ ...m, [mt.id]: true }));
    } catch {
      // Offline save failed silently
    } finally {
      setDownloading(null);
    }
  };

  const { data: history } = useQuery({
    queryKey: ["mockHistory"],
    queryFn: mockTestApi.getHistory,
  });

  const getStatus = (id: string) => {
    if (!history) return "todo";
    const h = (history as any[]).find((h: any) => h.mockTestId === id);
    if (!h) return "todo";
    return h.status === "COMPLETED" ? "done" : "progress";
  };

  const getScore = (id: string) => {
    if (!history) return null;
    const h = (history as any[]).find((h: any) => h.mockTestId === id && h.status === "COMPLETED");
    return h?.totalScore ?? null;
  };

  const handleTestClick = (mt: any) => {
    const status = getStatus(mt.id);
    if (status === "progress") {
      navigate(`/mock-test/${mt.id}`);
    } else {
      setPreTest({ id: mt.id, title: mt.title, durationMinutes: mt.durationMinutes });
    }
  };

  return (
    <>
      <MobileHeader
        title="Thi thử"
        subtitle="Mock Test PTE Academic"
        right={
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">Exam Mode</span>
          </div>
        }
      />

      <div className="px-4 space-y-3 pb-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          {(["library", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              )}
            >
              {t === "library" ? "📚 Thư viện đề" : "📋 Lịch sử"}
            </button>
          ))}
        </div>

        {/* Library */}
        {tab === "library" && (
          <div className="space-y-2.5">
            {/* Exam tips banner */}
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
            >
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-bold text-sm text-white">Mô phỏng thi thật</p>
                <p className="text-xs text-white/50">Làm trong 1 lần • Không được back • Timer chạy liên tục</p>
              </div>
            </div>

            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <MSkeleton key={i} className="h-24 rounded-2xl" />
            ))}

            {!isLoading && (tests || []).length === 0 && (
              <MEmptyState icon="📝" title="Chưa có mock test" description="Admin chưa thêm đề thi nào." />
            )}

            {(tests || []).map((mt: any) => {
              const status = getStatus(mt.id);
              const score = getScore(mt.id);

              return (
                <button
                  key={mt.id}
                  onClick={() => handleTestClick(mt)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-left shadow-sm border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex flex-col items-center justify-center flex-shrink-0 border border-amber-100">
                    <span className="text-[8px] font-black text-amber-500 uppercase">PTE</span>
                    <span className="font-display font-black text-lg text-amber-700 leading-none">
                      {mt.code?.replace(/\D/g, "").slice(-2) || "??"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{mt.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ⏱ {mt.durationMinutes} phút · {mt.updatedYear || "2024"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <MBadge color={status === "done" ? "green" : status === "progress" ? "gold" : "gray"}>
                        {status === "done" ? "✓ Hoàn thành" : status === "progress" ? "Tiếp tục" : "Chưa làm"}
                      </MBadge>
                      {score !== null && <MBadge color="gold">{score}/90</MBadge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Offline download button */}
                    <button
                      onClick={(e) => handleDownload(mt, e)}
                      className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all",
                        offlineMap[mt.id]
                          ? "bg-green-50 border-green-300 text-green-600"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      )}
                      title={offlineMap[mt.id] ? "Xóa bản offline" : "Tải về offline"}
                    >
                      {downloading === mt.id ? (
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : offlineMap[mt.id] ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                      status === "progress" ? "bg-amber-400" : "bg-brand-gold"
                    )}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d={status === "progress" ? "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" : "M9 18l6-6-6-6"} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-2.5">
            {(!history || (history as any[]).length === 0) && (
              <MEmptyState icon="📋" title="Chưa có lịch sử thi" description="Hoàn thành một mock test để xem kết quả." />
            )}
            {(history || []).map((h: any) => {
              const mt = (tests as any[])?.find((t: any) => t.id === h.mockTestId);
              return (
                <button
                  key={h.id}
                  onClick={() =>
                    h.status === "COMPLETED"
                      ? navigate(`/mock-test/result/${h.id}`)
                      : navigate(`/mock-test/${h.mockTestId}`)
                  }
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-left shadow-sm border border-gray-100"
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl",
                    h.status === "COMPLETED" ? "bg-green-50" : "bg-amber-50"
                  )}>
                    {h.status === "COMPLETED" ? "✅" : "⏳"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{mt?.title || "Mock Test"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    {h.totalScore != null && (
                      <p className="font-display font-black text-lg text-brand-gold">{h.totalScore}<span className="text-xs text-gray-400">/90</span></p>
                    )}
                    <MBadge color={h.status === "COMPLETED" ? "green" : "gold"}>
                      {h.status === "COMPLETED" ? "Xong" : "Dang làm"}
                    </MBadge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-test modal */}
      {preTest && (
        <PreTestModal
          test={preTest}
          onStart={() => { navigate(`/mock-test/${preTest.id}`); setPreTest(null); }}
          onClose={() => setPreTest(null)}
        />
      )}
    </>
  );
}
