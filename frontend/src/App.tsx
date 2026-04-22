import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage, RegisterPage } from "./pages/auth/AuthPages";
import DashboardPage from "./pages/DashboardPage";
import SkillPage from "./pages/SkillPage";
import QuestionPage from "./pages/QuestionPage";
import { MockTestPage, MockTestExamPage } from "./pages/MockTestPage";
import MockTestResultPage from "./pages/MockTestResultPage";
import ProfilePage from "./pages/ProfilePage";
import BookmarksPage from "./pages/BookmarksPage";
import AdminPage from "./pages/AdminPage";
import PremiumPage from "./pages/PremiumPage";
import { useAuthStore } from "./stores/authStore";

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/:skill"
            element={
              <ProtectedRoute>
                <SkillPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/question/:id"
            element={
              <ProtectedRoute>
                <QuestionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-test"
            element={
              <ProtectedRoute>
                <MockTestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-test/result/:attemptId"
            element={
              <ProtectedRoute>
                <MockTestResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-test/:id"
            element={
              <ProtectedRoute>
                <MockTestExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <BookmarksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/premium"
            element={
              <ProtectedRoute>
                <PremiumPage />
              </ProtectedRoute>
            }
          />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
