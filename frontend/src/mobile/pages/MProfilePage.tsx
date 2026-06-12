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

export default function MProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
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
                    <MBadge color={user?.plan === "premium" ? "gold" : "gray"}>
                      {user?.plan === "premium" ? "⭐ Premium" : "Free"}
                    </MBadge>
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

        {/* Premium CTA */}
        {user?.plan !== "premium" && (
          <button
            onClick={() => navigate("/premium")}
            className="w-full rounded-2xl p-4 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" }}
          >
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #fdd52f 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <p className="text-xs text-brand-gold-bright font-black uppercase tracking-wider mb-1">
              ⭐ Nâng cấp Premium
            </p>
            <p className="font-display font-bold text-white text-sm">
              Mở khoá toàn bộ nội dung & AI chấm không giới hạn
            </p>
            <p className="text-xs text-white/60 mt-1">Chạm để xem gói</p>
          </button>
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
        <MButton variant="danger" fullWidth onClick={handleLogout}>
          Đăng xuất
        </MButton>

        <div className="flex flex-col items-center pb-2 gap-1">
          <img src={logoUrl} alt="FLY Academy" className="h-8 w-auto opacity-60" />
          <p className="text-xs text-gray-400">v2.0 · PTE Academic</p>
        </div>
        <div className="h-4" />
      </div>
    </>
  );
}
