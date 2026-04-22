import { NavLink, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { useAuthStore } from "../../stores/authStore";

const NAV = [
  { label: "Overview", icon: "⊞", to: "/dashboard" },
  { label: "Magic Centre", icon: "✨", to: "/magic-centre" },
];

const SKILL_NAV = [
  {
    label: "Speaking",
    icon: "🎙️",
    to: "/practice/speaking",
    skill: "SPEAKING",
  },
  { label: "Writing", icon: "✍️", to: "/practice/writing", skill: "WRITING" },
  { label: "Reading", icon: "📖", to: "/practice/reading", skill: "READING" },
  {
    label: "Listening",
    icon: "🎧",
    to: "/practice/listening",
    skill: "LISTENING",
  },
];

const BOTTOM_NAV = [
  { label: "Mock Test", icon: "🎯", to: "/mock-test" },
  { label: "Bookmarks", icon: "🔖", to: "/bookmarks" },
  { label: "Premium", icon: "⭐", to: "/premium" },
  { label: "Admin", icon: "⚙️", to: "/admin" },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FE";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[230px] bg-brand-black flex flex-col z-40 border-r-2 border-brand-dark2">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-brand-dark2">
        <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          ✈️
        </div>
        <div>
          <div className="font-display font-black text-[18px] text-white leading-none">
            Fly<span className="text-brand-yellow">Edu</span>
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            PTE Academic · v1.0
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
        <p className="text-[9.5px] font-black uppercase tracking-widest text-gray-600 px-2 mb-2">
          Menu
        </p>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx("nav-item", isActive && "nav-item-active")
            }
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}

        <div className="my-3 border-t border-brand-dark2" />
        <p className="text-[9.5px] font-black uppercase tracking-widest text-gray-600 px-2 mb-2">
          Question Bank
        </p>
        {SKILL_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx("nav-item", isActive && "nav-item-active")
            }
          >
            <span className="text-base">{n.icon}</span>
            <span className="flex-1">{n.label}</span>
          </NavLink>
        ))}

        <div className="my-3 border-t border-brand-dark2" />
        <p className="text-[9.5px] font-black uppercase tracking-widest text-gray-600 px-2 mb-2">
          Thi thử
        </p>
        {BOTTOM_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx("nav-item", isActive && "nav-item-active")
            }
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>

      {/* User */}
      <div className="p-2.5 border-t border-brand-dark2">
        <div
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg cursor-pointer hover:bg-brand-dark2 transition-colors group"
          onClick={() => navigate("/profile")}
        >
          <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center text-[12px] font-black text-brand-black flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">
              {user?.fullName || "User"}
            </p>
            <p className="text-[10.5px] text-brand-yellow">
              ⭐ {user?.plan === "premium" ? "Premium" : "Free"} Plan
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs transition-all"
            title="Đăng xuất"
          >
            ⏏
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Top Header ────────────────────────────────────────────────────────────
function TopHeader() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FE";

  return (
    <header className="fixed top-0 right-0 left-[230px] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 shadow-sm">
      <div className="text-gray-600 text-sm">
        📚 {user?.fullName || "Học viên"}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-brand-yellow flex items-center justify-center text-[11px] font-bold text-brand-black">
            {initials}
          </div>
          <span className="text-sm text-gray-700 font-medium">
            {user?.fullName || "Profile"}
          </span>
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Đăng xuất"
        >
          🚪 Đăng xuất
        </button>
      </div>
    </header>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[230px] flex-1">
        <TopHeader />
        <main className="pt-16 min-h-screen bg-[#F7F6F3]">{children}</main>
      </div>
    </div>
  );
}
