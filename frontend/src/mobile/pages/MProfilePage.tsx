import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../../api";
import { logoUrl } from "../../assets";
import { useAuthStore } from "../../stores/authStore";
import { MobileHeader } from "../layout/MobileShell";
import { MButton, MInput, MBadge, MProgressBar } from "../ui";
import { setupSmartNotifications, cancelAllNotifications, isNotifSetup, getNotifHour, isNotifSupported } from "../../services/notifications";
import { useUserGoals, KEY_TARGET_SCORE, KEY_EXAM_DATE } from "./MOnboardingGate";
import { clsx } from "clsx";
import { Capacitor } from "@capacitor/core";

export default function MProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);

  const isIOS = Capacitor.getPlatform() === "ios";

  const [deleteModalStep, setDeleteModalStep] = React.useState<'idle' | 'confirm' | 'deleting' | 'success' | 'error'>('idle');

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => {
      setDeleteModalStep('success');
    },
    onError: () => {
      setDeleteModalStep('error');
    }
  });

  const handleDeleteAccount = () => {
    setDeleteModalStep('confirm');
  };
  const [fullName, setFullName] = React.useState(user?.fullName || "");

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: usersApi.getProfile });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: usersApi.getStats });
  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: usersApi.getLeaderboard });

  const updateMutation = useMutation({
    mutationFn: (data: { fullName: string }) => usersApi.updateProfile(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setUser({ ...user!, fullName: data.fullName });
      setEditing(false);
    },
  });

  const initials = (profile?.fullName || user?.fullName || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const SKILL_ICONS: Record<string, string> = {
    SPEAKING: "🎙️",
    WRITING: "✍️",
    READING: "📖",
    LISTENING: "🎧",
  };

  const myRank = (leaderboard || []).findIndex((u: any) => u.id === user?.id) + 1;
  const { targetScore, examDate } = useUserGoals();
  const [notifEnabled, setNotifEnabled] = React.useState(isNotifSetup);
  const [notifHour, setNotifHour] = React.useState(getNotifHour);
  const [notifSupported, setNotifSupported] = React.useState(false);
  const [localTarget, setLocalTarget] = React.useState(targetScore);
  const [localExamDate, setLocalExamDate] = React.useState(examDate);

  const [biometricsEnabled, setBiometricsEnabled] = React.useState(
    localStorage.getItem("fly_biometrics_enabled") === "true"
  );

  const handleBiometricsToggle = async () => {
    if (biometricsEnabled) {
      localStorage.removeItem("fly_biometrics_enabled");
      localStorage.removeItem("fly_biometric_token");
      localStorage.removeItem("fly_biometric_user");
      setBiometricsEnabled(false);
    } else {
      const confirm = window.confirm(
        "Cho phép FLY Academy sử dụng Face ID / Touch ID để đăng nhập nhanh trong các lần sau?"
      );
      if (confirm) {
        const token = localStorage.getItem("fly_edu_token");
        if (token && user) {
          localStorage.setItem("fly_biometrics_enabled", "true");
          localStorage.setItem("fly_biometric_token", token);
          localStorage.setItem("fly_biometric_user", JSON.stringify(user));
          setBiometricsEnabled(true);
        } else {
          alert("Vui lòng đăng nhập lại để bật tính năng này.");
        }
      }
    }
  };

  React.useEffect(() => {
    isNotifSupported().then(setNotifSupported);
  }, []);

  const handleNotifToggle = async () => {
    if (notifEnabled) {
      await cancelAllNotifications(); // also clears KEY_NOTIF_SETUP
      setNotifEnabled(false);
    } else {
      const ok = await setupSmartNotifications(notifHour);
      if (ok) setNotifEnabled(true);
    }
  };

  const saveGoals = () => {
    if (localTarget) localStorage.setItem(KEY_TARGET_SCORE, localTarget);
    if (localExamDate) localStorage.setItem(KEY_EXAM_DATE, localExamDate);
  };

  return (
    <>
      <MobileHeader title="Hồ sơ cá nhân" />

      <div className="px-4 space-y-4">
        {/* Avatar + name */}
        <div className="m-card-elevated rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-gold flex items-center justify-center flex-shrink-0 shadow-gold-sm">
              <span className="font-display font-black text-2xl text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <MInput
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên"
                  />
                  <div className="flex gap-2">
                    <MButton
                      size="sm"
                      variant="primary"
                      loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ fullName })}
                    >
                      Lưu
                    </MButton>
                    <MButton size="sm" variant="secondary" onClick={() => setEditing(false)}>
                      Huỷ
                    </MButton>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-display font-black text-base text-gray-900 truncate">
                    {profile?.fullName || user?.fullName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {myRank > 0 && (
                      <MBadge color="green">#{myRank} BXH</MBadge>
                    )}
                  </div>
                </>
              )}
            </div>
            {!editing && (
              <button
                onClick={() => { setFullName(user?.fullName || ""); setEditing(true); }}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"
              >
                ✏️
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Đã làm", value: stats?.totalAttempts || 0 },
            { label: "Điểm TB", value: `${Math.round(stats?.avgScore || 0)}/90` },
            { label: "Streak 🔥", value: `${stats?.streakDays || 0} ngày` },
          ].map((s) => (
            <div key={s.label} className="m-card rounded-2xl p-3 text-center">
              <p className="font-display font-black text-lg text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Skill breakdown */}
        {stats?.skillStats && (
          <div className="m-card-elevated rounded-2xl p-4 space-y-3">
            <p className="m-section-label mb-0">Tiến độ kỹ năng</p>
            {Object.entries(stats.skillStats).map(([skill, data]: [string, any]) => (
              <div key={skill}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">
                    {SKILL_ICONS[skill]} {skill.charAt(0) + skill.slice(1).toLowerCase()}
                  </span>
                  <span className="text-sm font-bold text-brand-gold">
                    {Math.round(data.avgScore || 0)}/90
                  </span>
                </div>
                <MProgressBar value={data.avgScore || 0} max={90} color="gold" height="h-1.5" animated />
              </div>
            ))}
          </div>
        )}



        {/* Menu items */}
        <div className="m-card-elevated rounded-2xl overflow-hidden divide-y divide-gray-50">
          <button
            onClick={() => navigate("/bookmarks")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left"
          >
            <span className="text-lg">🔖</span>
            <span className="font-semibold text-sm text-gray-800 flex-1">Câu đã đánh dấu</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" />
            </svg>
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg">⚙️</span>
              <span className="font-semibold text-sm text-gray-800 flex-1">Quản trị</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Goals settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-bold text-sm text-gray-900">🎯 Mục tiêu luyện tập</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Điểm mục tiêu</label>
              <div className="flex gap-2">
                {["30", "50", "65", "79"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setLocalTarget(v)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all",
                      localTarget === v
                        ? "border-brand-gold bg-amber-50 text-amber-900"
                        : "border-gray-200 text-gray-500"
                    )}
                  >{v}+</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Ngày thi dự kiến</label>
              <input
                type="date"
                value={localExamDate}
                onChange={(e) => setLocalExamDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>
            <button
              onClick={saveGoals}
              className="w-full py-2.5 rounded-xl bg-brand-gold text-white font-bold text-sm active:scale-[0.97] transition-all"
            >
              Lưu mục tiêu
            </button>
          </div>
        </div>

        {/* Notification settings */}
        {notifSupported && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="font-bold text-sm text-gray-900">🔔 Thông báo nhắc học</p>
              <button
                onClick={handleNotifToggle}
                className={clsx(
                  "w-12 h-6 rounded-full transition-all relative",
                  notifEnabled ? "bg-brand-gold" : "bg-gray-200"
                )}
              >
                <div className={clsx(
                  "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
                  notifEnabled ? "right-0.5" : "left-0.5"
                )} />
              </button>
            </div>
            {notifEnabled && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-500">Giờ nhận thông báo mỗi ngày</p>
                <select
                  value={notifHour}
                  onChange={async (e) => {
                    const h = parseInt(e.target.value);
                    setNotifHour(h);
                    await setupSmartNotifications(h);
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  {[7, 8, 9, 12, 13, 18, 19, 20, 21, 22].map((h) => (
                    <option key={h} value={h}>
                      {h}:00 {h < 12 ? "Sáng" : h < 18 ? "Chiều" : "Tối"}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400">
                  Thông báo thông minh: nhắc tập trung vào điểm yếu và đếm ngược đến kỳ thi
                </p>
              </div>
            )}
          </div>
        )}

        {/* Biometrics FaceID / TouchID settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-gray-900">🔐 Đăng nhập bằng sinh trắc học</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sử dụng Face ID hoặc Touch ID trên iPhone</p>
            </div>
            <button
              onClick={handleBiometricsToggle}
              className={clsx(
                "w-12 h-6 rounded-full transition-all relative",
                biometricsEnabled ? "bg-brand-gold" : "bg-gray-200"
              )}
            >
              <div className={clsx(
                "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
                biometricsEnabled ? "right-0.5" : "left-0.5"
              )} />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="space-y-2.5">
          <MButton variant="danger" fullWidth onClick={handleLogout}>
            Đăng xuất
          </MButton>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteMutation.isPending}
            className="w-full py-3 rounded-2xl text-xs font-bold text-red-500 bg-red-50/50 hover:bg-red-50 border border-red-100/50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            {deleteMutation.isPending ? "Đang xóa..." : "Xóa tài khoản"}
          </button>
        </div>

        <div className="flex flex-col items-center pb-2 gap-1">
          <img src={logoUrl} alt="FLY Academy" className="h-8 w-auto opacity-60" />
          <p className="text-xs text-gray-400">v2.0 · PTE Academic</p>
        </div>
        <div className="h-4" />
      </div>

      {deleteModalStep !== 'idle' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 transition-opacity">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4 motion-safe:animate-fade-in-up">
            
            {deleteModalStep === 'confirm' && (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 text-xl font-bold">
                  ⚠️
                </div>
                <h3 className="font-display font-black text-lg text-gray-900">Xóa tài khoản?</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Hành động này sẽ xóa vĩnh viễn tài khoản của bạn cùng toàn bộ tiến trình học tập, lịch sử thi thử và không thể hoàn tác.
                </p>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setDeleteModalStep('idle')}
                    className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModalStep('deleting');
                      deleteMutation.mutate();
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs active:scale-95 transition-all"
                  >
                    Xóa vĩnh viễn
                  </button>
                </div>
              </>
            )}

            {deleteModalStep === 'deleting' && (
              <div className="py-6 space-y-4">
                <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500 font-bold">Đang xóa toàn bộ dữ liệu của bạn...</p>
              </div>
            )}

            {deleteModalStep === 'success' && (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500 text-xl">
                  ✅
                </div>
                <h3 className="font-display font-black text-lg text-gray-900">Đã xóa tài khoản</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Tài khoản và dữ liệu học tập của bạn đã được xóa hoàn toàn khỏi hệ thống FLY Academy.
                </p>
                <button
                  onClick={() => {
                    setDeleteModalStep('idle');
                    logout();
                    navigate("/login", { replace: true });
                  }}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs active:scale-95 transition-all mt-2"
                >
                  Đồng ý
                </button>
              </>
            )}

            {deleteModalStep === 'error' && (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 text-xl">
                  ❌
                </div>
                <h3 className="font-display font-black text-lg text-gray-900">Lỗi hệ thống</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Không thể thực hiện yêu cầu xóa tài khoản vào lúc này. Vui lòng liên hệ quản trị viên hoặc thử lại sau.
                </p>
                <button
                  onClick={() => setDeleteModalStep('idle')}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs active:scale-95 transition-all mt-2"
                >
                  Đóng
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
