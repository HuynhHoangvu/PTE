import React from "react";
import { NavLink, useLocation, Outlet } from "react-router-dom";
import { clsx } from "clsx";

interface TabItem {
  path: string;
  icon: (active: boolean) => React.ReactNode;
  label: string;
}

const TABS: TabItem[] = [
  {
    path: "/dashboard",
    label: "Trang chủ",
    icon: (active) => (
      <svg className={clsx("w-5 h-5 transition-all", active ? "stroke-brand-gold" : "stroke-gray-400")}
        viewBox="0 0 24 24" fill={active ? "rgba(228,168,8,0.12)" : "none"} strokeWidth={active ? 2.5 : 2}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    path: "/practice",
    label: "Luyện tập",
    icon: (active) => (
      <svg className={clsx("w-5 h-5 transition-all", active ? "stroke-brand-gold" : "stroke-gray-400")}
        viewBox="0 0 24 24" fill={active ? "rgba(228,168,8,0.12)" : "none"} strokeWidth={active ? 2.5 : 2}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    path: "/mock-test",
    label: "Thi thử",
    icon: (active) => (
      <svg className={clsx("w-5 h-5 transition-all", active ? "stroke-brand-gold" : "stroke-gray-400")}
        viewBox="0 0 24 24" fill={active ? "rgba(228,168,8,0.12)" : "none"} strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: "/analytics",
    label: "Phân tích",
    icon: (active) => (
      <svg className={clsx("w-5 h-5 transition-all", active ? "stroke-brand-gold" : "stroke-gray-400")}
        viewBox="0 0 24 24" fill={active ? "rgba(228,168,8,0.12)" : "none"} strokeWidth={active ? 2.5 : 2}>
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: "/profile",
    label: "Cá nhân",
    icon: (active) => (
      <svg className={clsx("w-5 h-5 transition-all", active ? "stroke-brand-gold" : "stroke-gray-400")}
        viewBox="0 0 24 24" fill={active ? "rgba(228,168,8,0.12)" : "none"} strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MobileShell({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const isPracticeActive = pathname.startsWith("/practice") || pathname.startsWith("/question");

  return (
    <div className="mobile-shell">
      <main className="mobile-page">{children ?? <Outlet />}</main>

      {/* Bottom tab bar */}
      <nav className="tab-bar">
        <div className="flex items-stretch h-[56px]">
          {TABS.map((tab) => {
            const isActive =
              tab.path === "/practice"
                ? isPracticeActive
                : pathname === tab.path || pathname.startsWith(tab.path + "/");
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative min-w-0"
              >
                {tab.icon(isActive)}
                <span
                  className={clsx(
                    "text-[9px] font-bold leading-none transition-colors",
                    isActive ? "text-brand-gold" : "text-gray-400"
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-gold rounded-full" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ── Mobile header (reusable) ──────────────────────────────────────────────────
export function MobileHeader({
  title,
  subtitle,
  left,
  right,
  transparent,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <header
      className={clsx(
        "mobile-header",
        transparent && "bg-transparent border-none shadow-none backdrop-blur-0"
      )}
    >
      <div className="flex items-center h-[56px] px-4 gap-3">
        {left && <div className="flex-shrink-0">{left}</div>}
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="font-display font-black text-base text-gray-900 truncate leading-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-[11px] text-gray-500 font-medium truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}

// ── Back header for full-screen pages ────────────────────────────────────────
export function MobileBackHeader({
  title,
  onBack,
  right,
  dark,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <header
      className={clsx(
        "practice-mobile-header",
        !dark && "!bg-white !border-b !border-gray-100 !shadow-none"
      )}
    >
      <div className="flex items-center h-[56px] px-4 gap-3">
        <button
          onClick={onBack}
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform",
            dark ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
          </svg>
        </button>
        <h1
          className={clsx(
            "flex-1 font-display font-bold text-sm truncate",
            dark ? "text-white" : "text-gray-900"
          )}
        >
          {title}
        </h1>
        {right}
      </div>
    </header>
  );
}
