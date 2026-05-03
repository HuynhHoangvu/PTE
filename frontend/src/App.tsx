import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./stores/authStore";
import { App as CapApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import React from "react";
import { refreshNotificationsIfNeeded } from "./services/notifications";

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

// Keep desktop pages for admin and mock test detail/result
import { MockTestExamPage } from "./pages/MockTestPage";
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

/** Layout route: MobileShell (bottom tabs) wrapping tabbed pages */
function TabbedLayout() {
  return (
    <ProtectedRoute>
      <MobileShell />
    </ProtectedRoute>
  );
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

function AppInner() {
  useAndroidBackButton();
  useNotificationRefresh();
  useNotificationDeepLink();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MOnboardingGate>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppInner />
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<PublicRoute><MLoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><MRegisterPage /></PublicRoute>} />
          <Route path="/privacy" element={<MPrivacyPolicyPage />} />
          <Route path="/terms" element={<MTermsPage />} />

          {/* ── Tabbed (bottom nav shell) ── */}
          <Route element={<TabbedLayout />}>
            <Route path="/dashboard" element={<MDashboardPage />} />
            <Route path="/practice" element={<MPracticePage />} />
            <Route path="/practice/:skill" element={<MSkillPage />} />
            <Route path="/mock-test" element={<MMockTestPage />} />
            <Route path="/analytics" element={<MAnalyticsPage />} />
            <Route path="/profile" element={<MProfilePage />} />
          </Route>

          {/* ── Full-screen protected (no bottom tabs) ── */}
          <Route path="/practice/:skill/:type" element={<ProtectedRoute><MQuestionListPage /></ProtectedRoute>} />
          <Route path="/question/:id" element={<ProtectedRoute><MQuestionPage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><MBookmarksPage /></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><MPremiumPage /></ProtectedRoute>} />
          <Route path="/mock-test/result/:attemptId" element={<ProtectedRoute><MockTestResultPage /></ProtectedRoute>} />
          <Route path="/mock-test/:id" element={<ProtectedRoute><MockTestExamPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </BrowserRouter>
      </MOnboardingGate>
    </QueryClientProvider>
  );
}
