import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Sparkles,
  Mic2, PenLine, BookOpen, Headphones,
  ClipboardList, Bookmark, Crown, Settings2,
  LogOut, Plane, Globe, UserCircle2,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

// ── Màu tông gold dùng inline để đảm bảo render đúng ─────────────────────────
const GOLD   = "#C8952A";
const GOLD_B = "#E8B84B"; // bright

const NAV = [
  { label: "Overview",     icon: LayoutDashboard, to: "/dashboard"    },
  { label: "Magic Centre", icon: Sparkles,        to: "/magic-centre" },
];
const SKILL_NAV = [
  { label: "Speaking",  icon: Mic2,       to: "/practice/speaking"  },
  { label: "Writing",   icon: PenLine,    to: "/practice/writing"   },
  { label: "Reading",   icon: BookOpen,   to: "/practice/reading"   },
  { label: "Listening", icon: Headphones, to: "/practice/listening" },
];
const BOTTOM_NAV = [
  { label: "Mock Test", icon: ClipboardList, to: "/mock-test" },
  { label: "Bookmarks", icon: Bookmark,      to: "/bookmarks" },
  { label: "Premium",   icon: Crown,         to: "/premium"   },
  { label: "Admin",     icon: Settings2,     to: "/admin"     },
];

// ── Nav item component ────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to: string }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                     cursor-pointer transition-all duration-150 select-none"
          style={
            isActive
              ? {
                  background: `linear-gradient(90deg, rgba(200,149,42,0.22) 0%, rgba(200,149,42,0.08) 100%)`,
                  borderLeft: `3px solid ${GOLD}`,
                  paddingLeft: "10px", // compensate for border
                }
              : { borderLeft: "3px solid transparent" }
          }
        >
          {/* Icon container */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={
              isActive
                ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})`, boxShadow: `0 2px 8px rgba(200,149,42,0.45)` }
                : { background: "rgba(255,255,255,0.06)" }
            }
          >
            <Icon
              size={14}
              strokeWidth={isActive ? 2.5 : 2}
              color={isActive ? "#FFFFFF" : "#6B7280"}
            />
          </div>

          {/* Label */}
          <span
            className="text-[13px] font-semibold flex-1 transition-colors"
            style={{ color: isActive ? "#F0D060" : "#9CA3AF" }}
          >
            {label}
          </span>

          {/* Active dot */}
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 px-2 mb-2 mt-1">
      <div className="h-px flex-1" style={{ background: "rgba(200,149,42,0.15)" }} />
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: "rgba(200,149,42,0.50)" }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(200,149,42,0.15)" }} />
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FA";

  const isPremium = user?.plan === "premium";

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[230px] flex flex-col z-40"
      style={{
        background: "linear-gradient(180deg, #0C0C18 0%, #0A0A12 100%)",
        borderRight: `1px solid rgba(200,149,42,0.18)`,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid rgba(200,149,42,0.12)" }}
      >
        {/* Plane icon badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_B} 100%)`,
            boxShadow: `0 4px 12px rgba(200,149,42,0.40)`,
          }}
        >
          <Plane size={17} color="#FFF" strokeWidth={2.5} />
        </div>

        {/* Brand text — inline style for guaranteed gradient render */}
        <div>
          <div className="font-display font-black text-[16px] leading-none tracking-tight">
            <span
              style={{
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD_B}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              FLY
            </span>
            <span style={{ color: "#FFFFFF" }}> ACADEMY</span>
          </div>
          <div
            className="text-[9.5px] font-medium mt-0.5"
            style={{ color: "rgba(200,149,42,0.45)" }}
          >
            PTE Academic Platform
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
        <SectionLabel>Menu</SectionLabel>
        {NAV.map((n) => (
          <NavItem key={n.to} {...n} />
        ))}

        <div className="my-3" />

        <SectionLabel>Question Bank</SectionLabel>
        {SKILL_NAV.map((n) => (
          <NavItem key={n.to} {...n} />
        ))}

        <div className="my-3" />

        <SectionLabel>Thi thử</SectionLabel>
        {BOTTOM_NAV.map((n) => (
          <NavItem key={n.to} {...n} />
        ))}
      </div>

      {/* ── User card ────────────────────────────────────────────── */}
      <div
        className="p-2.5"
        style={{ borderTop: "1px solid rgba(200,149,42,0.12)" }}
      >
        <div
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer
                     transition-all duration-150 group"
          style={{ background: "rgba(255,255,255,0.03)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background =
              "rgba(200,149,42,0.08)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background =
              "rgba(255,255,255,0.03)")
          }
          onClick={() => navigate("/profile")}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-[11px] font-black text-white flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})`,
              boxShadow: `0 2px 8px rgba(200,149,42,0.35)`,
            }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">
              {user?.fullName || "Học viên"}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Crown size={9} color={isPremium ? GOLD : "#4B5563"} />
              <span
                className="text-[10px] font-bold"
                style={{ color: isPremium ? GOLD : "#4B5563" }}
              >
                {isPremium ? "Premium" : "Free Plan"}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                       transition-all duration-150"
            style={{ color: "#6B7280" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#6B7280";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
            title="Đăng xuất"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Top Header ────────────────────────────────────────────────────────────────
function TopHeader() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FA";

  return (
    <header
      className="fixed top-0 right-0 left-[230px] h-14 flex items-center
                 justify-between px-6 z-30"
      style={{
        background: "rgba(248,247,244,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-2">
        <Globe size={14} color={GOLD} />
        <span className="text-sm font-semibold text-gray-600">
          {user?.fullName || "Học viên"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                     hover:bg-gray-100 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}
          >
            {initials}
          </div>
          <span className="text-sm text-gray-700 font-semibold">
            {user?.fullName || "Profile"}
          </span>
          <UserCircle2 size={13} className="text-gray-400" />
        </button>

        <div className="h-5 w-px bg-gray-200" />

        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold
                     text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={13} />
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[230px] flex-1">
        <TopHeader />
        <main
          className="pt-14 min-h-screen"
          style={{ background: "#F8F7F4" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
