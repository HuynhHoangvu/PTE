import React, { useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Mic2, PenLine, BookOpen, Headphones,
  ClipboardList, Crown, Settings2, Bookmark,
  LogOut, Globe, UserCircle2, Menu,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { LUX } from "../../theme/luxuryPalette";
import { clsx } from "clsx";

// ── Logo with white-background removed via Canvas ─────────────────────────────
function LogoImg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        if (r > 220 && g > 220 && b > 220) d.data[i + 3] = 0;
      }
      ctx.putImageData(d, 0, 0);
      setReady(true);
    };
    img.onerror = () => setReady(true);
    img.src = "/Logo.png";
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-16 w-auto object-contain"
      style={{
        opacity: ready ? 1 : 0,
        transition: "opacity 0.2s",
        filter: "drop-shadow(0 2px 10px rgba(228,168,8,0.45))",
      }}
    />
  );
}

// ── Luxury palette aliases ───────────────────────────────────────────────────
const ACCENT = LUX.goldBright;
const GOLD   = LUX.gold;
const GOLD_B = LUX.goldBright;
const NAV_ON = LUX.goldPale;
const NAV_OFF = "rgba(212,212,212,0.85)";

const NAV = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/dashboard" },
];
const SKILL_NAV = [
  { label: "Speaking",  icon: Mic2,       to: "/practice/speaking"  },
  { label: "Writing",   icon: PenLine,    to: "/practice/writing"   },
  { label: "Reading",   icon: BookOpen,   to: "/practice/reading"   },
  { label: "Listening", icon: Headphones, to: "/practice/listening" },
];
const SAVED_NAV = [{ label: "Đã lưu", icon: Bookmark, to: "/bookmarks" }];
const BOTTOM_NAV = [
  { label: "Thi thử",  icon: ClipboardList, to: "/mock-test" },
  { label: "Premium",  icon: Crown,         to: "/premium"   },
  { label: "Quản trị", icon: Settings2,     to: "/admin"     },
];

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({
  icon: Icon, label, to, onNavClick,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  onNavClick?: () => void;
}) {
  return (
    <NavLink to={to} onClick={onNavClick}>
      {({ isActive }) => (
        <div
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                     cursor-pointer transition-all duration-150 select-none"
          style={
            isActive
              ? {
                  background: `linear-gradient(90deg, rgba(253,213,47,0.14) 0%, rgba(253,213,47,0.04) 100%)`,
                  borderLeft: `3px solid ${ACCENT}`,
                  paddingLeft: "10px",
                }
              : { borderLeft: "3px solid transparent" }
          }
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={
              isActive
                ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})`, boxShadow: `0 2px 10px rgba(228,168,8,0.5)` }
                : { background: "rgba(255,255,255,0.08)" }
            }
          >
            <Icon
              size={14}
              strokeWidth={isActive ? 2.5 : 2}
              color={isActive ? "#FFFFFF" : NAV_OFF}
            />
          </div>

          <span
            className="text-[13px] font-semibold flex-1 transition-colors"
            style={{ color: isActive ? NAV_ON : NAV_OFF }}
          >
            {label}
          </span>

          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5 mt-1">
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "rgba(253,213,47,0.55)" }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(253,213,47,0.2)" }} />
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer whenever the route changes (on mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FA";

  const isPremium = user?.plan === "premium";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/50 z-[39] lg:hidden",
          "transition-opacity duration-300",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={clsx(
          "fixed left-0 top-0 bottom-0 w-[230px] flex flex-col z-40",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
        style={{
          background: `linear-gradient(180deg, ${LUX.charcoal} 0%, ${LUX.charcoalDeep} 100%)`,
          borderRight: "1px solid rgba(253,213,47,0.22)",
        }}
        aria-label="Sidebar navigation"
      >
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center px-4 py-4"
          style={{ borderBottom: "1px solid rgba(253,213,47,0.15)" }}
        >
          <LogoImg />
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
          <SectionLabel>Trang chính</SectionLabel>
          {NAV.map((n) => (
            <NavItem key={n.to} {...n} onNavClick={onClose} />
          ))}

          <div className="my-3" />

          <SectionLabel>Ngân hàng câu hỏi</SectionLabel>
          {SKILL_NAV.map((n) => (
            <NavItem key={n.to} {...n} onNavClick={onClose} />
          ))}

          <div className="my-3" />

          <SectionLabel>Đã lưu</SectionLabel>
          {SAVED_NAV.map((n) => (
            <NavItem key={n.to} {...n} onNavClick={onClose} />
          ))}

          <div className="my-3" />

          <SectionLabel>Thi và nâng cao</SectionLabel>
          {BOTTOM_NAV.map((n) => {
            if (n.to === "/admin" && user?.role !== "admin" && user?.role !== "teacher") return null;
            return <NavItem key={n.to} {...n} onNavClick={onClose} />;
          })}
        </div>

        {/* ── User card ────────────────────────────────────────────── */}
        <div
          className="p-2.5"
          style={{ borderTop: "1px solid rgba(253,213,47,0.15)" }}
        >
          <div
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer
                       transition-all duration-150 group"
            style={{ background: "rgba(255,255,255,0.03)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                "rgba(253,213,47,0.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                "rgba(255,255,255,0.03)")
            }
            onClick={() => navigate("/profile")}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center
                         text-[11px] font-black text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})`,
                boxShadow: `0 2px 10px rgba(228,168,8,0.45)`,
              }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">
                {user?.fullName || "Học viên"}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown size={9} color={isPremium ? ACCENT : "#CBD5E1"} />
                <span
                  className="text-[10px] font-bold"
                  style={{ color: isPremium ? ACCENT : "#E2E8F0" }}
                >
                  {isPremium ? "Premium" : "Free Plan"}
                </span>
              </div>
            </div>

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
    </>
  );
}

// ── Top Header ────────────────────────────────────────────────────────────────
function TopHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
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
      className="fixed top-0 right-0 left-0 lg:left-[230px] h-14 flex items-center
                 justify-between px-3 lg:px-6 z-30 motion-safe:animate-fade-in-down"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(228,168,8,0.12)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-1"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        <Globe size={14} color={LUX.gold} strokeWidth={2} className="hidden lg:block" />
        <span className="text-sm font-semibold text-gray-600 hidden sm:block">
          {user?.fullName || "Học viên"}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl
                     hover:bg-gray-100 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}
          >
            {initials}
          </div>
          <span className="text-sm text-gray-700 font-semibold hidden md:block">
            {user?.fullName || "Profile"}
          </span>
          <UserCircle2 size={13} className="text-gray-400 hidden md:block" />
        </button>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm font-semibold
                     text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 lg:ml-[230px] min-w-0">
        <TopHeader onMenuOpen={() => setMobileOpen(true)} />
        <main
          className="pt-14 min-h-screen text-[15px] sm:text-base leading-normal antialiased"
          style={{
            background: "linear-gradient(175deg, #fffdf8 0%, #fefce8 50%, #fdf6d9 100%)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
