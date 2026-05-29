import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./stores/authStore";
import { App as CapApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import React from "react";
import { refreshNotificationsIfNeeded } from "./services/notifications";
import api from "./api/index";

// Hooks
import { useMediaQuery } from "./hooks/useMediaQuery";

// Mobile pages
import { MLoginPage, MRegisterPage } from "./mobile/pages/MAuthPage";
import MDashboardPage from "./mobile/pages/MDashboardPage";
import MSkillPage from "./mobile/pages/MSkillPage";
import MPracticePage from "./mobile/pages/MPracticePage";
import MQuestionPage from "./mobile/pages/MQuestionPage";
import MMockTestPage from "./mobile/pages/MMockTestPage";
import MProfilePage from "./mobile/pages/MProfilePage";
import MBookmarksPage from "./mobile/pages/MBookmarksPage";
import MPremiumPage from "./mobile/pages/MPremiumPage";
import MAnalyticsPage from "./mobile/pages/MAnalyticsPage";
import MQuestionListPage from "./mobile/pages/MQuestionListPage";
import { MobileShell } from "./mobile/layout/MobileShell";
import { MOnboardingGate } from "./mobile/pages/MOnboardingGate";
import { MPrivacyPolicyPage } from "./mobile/pages/MPrivacyPolicyPage";
import { MTermsPage } from "./mobile/pages/MTermsPage";

// Desktop pages
import DashboardPage from "./pages/DashboardPage";
import SkillPage from "./pages/SkillPage";
import QuestionPage from "./pages/QuestionPage";
import { MockTestPage, MockTestExamPage } from "./pages/MockTestPage";
import ProfilePage from "./pages/ProfilePage";
import BookmarksPage from "./pages/BookmarksPage";
import PremiumPage from "./pages/PremiumPage";
import MockTestResultPage from "./pages/MockTestResultPage";
import AdminPage from "./pages/AdminPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0, // No cache - always fresh
      gcTime: 1000 * 60 * 5, // Keep unused queries 5 min
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Unknown paths: dashboard if logged in, else login */
function CatchAllRedirect() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

/** Layout route: Conditionally renders MobileShell or Outlet */
function TabbedLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return (
    <ProtectedRoute>
      {isDesktop ? <Outlet /> : <MobileShell />}
    </ProtectedRoute>
  );
}

/** Responsive Route component */
function ResponsiveRoute({ mobile: MobileComp, desktop: DesktopComp }: any) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? <DesktopComp /> : <MobileComp />;
}

function useAndroidBackButton() {
  React.useEffect(() => {
    const listener = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    return () => { listener.then((h) => h.remove()); };
  }, []);
}

/** Refresh notification schedule when app comes to foreground */
function useNotificationRefresh() {
  React.useEffect(() => {
    const listener = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        refreshNotificationsIfNeeded();
      }
    });
    // Also refresh once on cold start
    refreshNotificationsIfNeeded();
    return () => { listener.then((h) => h.remove()); };
  }, []);
}

/** Handle notification tap → navigate to the right screen */
function useNotificationDeepLink() {
  const navigate = useNavigate();
  React.useEffect(() => {
    let handle: ReturnType<typeof LocalNotifications.addListener> | null = null;
    try {
      handle = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        const screen = action.notification?.extra?.screen;
        if (!screen) return;
        if (screen === "dashboard") navigate("/dashboard");
        else if (screen === "practice") navigate("/practice");
        else if (screen === "analytics") navigate("/analytics");
        else navigate("/dashboard");
      });
    } catch {
      // LocalNotifications not available on web
    }
    return () => { handle?.then((h) => h.remove()); };
  }, [navigate]);
}

function useForceUpdate() {
  const [updateInfo, setUpdateInfo] = React.useState<any>(null);

  React.useEffect(() => {
    async function checkVersion() {
      try {
        const { data } = await api.get("/app-version");
        if (data && data.forceUpdate) {
          try {
            const info = await CapApp.getInfo();
            const currentBuild = parseInt(info.build, 10);
            if (!isNaN(currentBuild) && currentBuild < data.minVersionCode) {
              setUpdateInfo(data);
            }
          } catch (e) {
            // Not running in Capacitor (e.g. Web) or getInfo failed
          }
        }
      } catch (err) {
        console.error("Failed to check app version", err);
      }
    }
    checkVersion();
  }, []);

  return updateInfo;
}

function ForceUpdateOverlay({ info }: { info: any }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center motion-safe:animate-fade-in-up">
      <div className="w-20 h-20 bg-brand-gold rounded-full flex items-center justify-center text-white text-3xl mb-6 shadow-xl shadow-brand-gold/30">
        🚀
      </div>
      <h2 className="text-2xl font-black font-display text-gray-900 mb-2">Bản Cập Nhật Mới</h2>
      <p className="text-[14px] text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
        {info.message || "Vui lòng cập nhật ứng dụng để tiếp tục sử dụng các tính năng mới nhất!"}
      </p>
      <button 
        onClick={() => window.open(info.storeUrl || "market://details?id=com.flyedu.pte", "_system")}
        className="bg-gradient-to-r from-brand-gold to-brand-gold-bright text-white font-bold py-3.5 px-8 rounded-xl shadow-gold-sm w-full max-w-xs active:scale-95 transition-transform"
      >
        Cập Nhật Ngay
      </button>
    </div>
  );
}

function AppContent() {
  useAndroidBackButton();
  useNotificationRefresh();
  useNotificationDeepLink();
  
  const updateInfo = useForceUpdate();

  if (updateInfo) {
    return <ForceUpdateOverlay info={updateInfo} />;
  }

  return (
    <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<PublicRoute><MLoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><MRegisterPage /></PublicRoute>} />
          <Route path="/privacy" element={<MPrivacyPolicyPage />} />
          <Route path="/terms" element={<MTermsPage />} />

          {/* ── Tabbed (bottom nav shell) ── */}
          <Route element={<TabbedLayout />}>
            <Route path="/dashboard" element={<ResponsiveRoute mobile={MDashboardPage} desktop={DashboardPage} />} />
            <Route path="/practice" element={<ResponsiveRoute mobile={MPracticePage} desktop={DashboardPage} />} />
            <Route path="/practice/:skill" element={<ResponsiveRoute mobile={MSkillPage} desktop={SkillPage} />} />
            <Route path="/mock-test" element={<ResponsiveRoute mobile={MMockTestPage} desktop={MockTestPage} />} />
            <Route path="/analytics" element={<ResponsiveRoute mobile={MAnalyticsPage} desktop={ProfilePage} />} />
            <Route path="/profile" element={<ResponsiveRoute mobile={MProfilePage} desktop={ProfilePage} />} />
          </Route>

          {/* ── Full-screen protected (no bottom tabs) ── */}
          <Route path="/practice/:skill/:type" element={<ProtectedRoute><ResponsiveRoute mobile={MQuestionListPage} desktop={SkillPage} /></ProtectedRoute>} />
          <Route path="/question/:id" element={<ProtectedRoute><ResponsiveRoute mobile={MQuestionPage} desktop={QuestionPage} /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><ResponsiveRoute mobile={MBookmarksPage} desktop={BookmarksPage} /></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><ResponsiveRoute mobile={MPremiumPage} desktop={PremiumPage} /></ProtectedRoute>} />
          <Route path="/mock-test/result/:attemptId" element={<ProtectedRoute><MockTestResultPage /></ProtectedRoute>} />
          <Route path="/mock-test/:id" element={<ProtectedRoute><MockTestExamPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MOnboardingGate>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
      </MOnboardingGate>
    </QueryClientProvider>
  );
}
