import axios from 'axios';

/** Dev: Vite proxy → `/api`. Mobile/production: `VITE_API_BASE_URL` = API host without path, e.g. `https://api.example.com` */
function apiBaseURL(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const base = raw?.replace(/\/$/, '') ?? '';
  if (base) return `${base}/api`;
  return '/api';
}

const api = axios.create({
  baseURL: apiBaseURL(),
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fly_edu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url || '');
      // Do not force-redirect on auth endpoints, otherwise login/google-login
      // failures look like an infinite reload loop on /login.
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/google')) {
        return Promise.reject(err);
      }
      // Clear both the raw token AND the Zustand persist store.
      // Without clearing 'fly-edu-auth', Zustand rehydrates the old token on
      // the next page load → ProtectedRoute lets the user in → 401 again → infinite loop.
      localStorage.removeItem('fly_edu_token');
      localStorage.removeItem('fly-edu-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; fullName: string; password: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  googleLogin: (data: { idToken: string }) =>
    api.post('/auth/google', data).then((r) => r.data),
  getMe: () => api.get('/auth/me').then((r) => r.data),
};

// ── Users ─────────────────────────────────────────────────────────────────
export const usersApi = {
  getStats: () => api.get('/users/stats').then((r) => r.data),
  getProfile: () => api.get('/users/profile').then((r) => r.data),
  updateProfile: (data: { fullName?: string }) =>
    api.patch('/users/profile', data).then((r) => r.data),
  getLeaderboard: () => api.get('/users/leaderboard').then((r) => r.data),
};

// ── Questions ─────────────────────────────────────────────────────────────
export const questionsApi = {
  list: (params: Record<string, any>) =>
    api.get('/questions', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/questions/${id}`).then((r) => r.data),
  getByIds: (ids: string[]) =>
    ids.length
      ? api.get('/questions/by-ids', { params: { ids: ids.join(',') } }).then((r) => r.data)
      : Promise.resolve([]),
  getSkillProgress: (skill: string) =>
    api.get(`/questions/skill/${skill}/progress`).then((r) => r.data),
  getAdjacent: (code: string, direction: 'prev' | 'next', type: string) =>
    api.get(`/questions/${code}/adjacent`, { params: { direction, type } }).then((r) => r.data),
  create: (data: Record<string, any>) => api.post('/questions', data).then((r) => r.data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/questions/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/questions/${id}`).then((r) => r.data),
};

// ── Attempts ──────────────────────────────────────────────────────────────
export const attemptsApi = {
  submitSpeaking: (questionId: string, audioBlob: Blob, duration?: number) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');
    form.append('questionId', questionId);
    if (duration) form.append('duration', String(duration));
    return api.post('/attempts/speaking', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  submitText: (data: { questionId: string; textAnswer?: string; selectedAnswers?: any; duration?: number }) =>
    api.post('/attempts/text', data).then((r) => r.data),
  pollScore: (id: string) => api.get(`/attempts/${id}/score`).then((r) => r.data),
  getByQuestion: (questionId: string) =>
    api.get(`/attempts/question/${questionId}`).then((r) => r.data),
};

// ── Mock Tests ────────────────────────────────────────────────────────────
export const mockTestApi = {
  list: () => api.get('/mock-tests').then((r) => r.data),
  getOne: (id: string) => api.get(`/mock-tests/${id}`).then((r) => r.data),
  getHistory: () => api.get('/mock-tests/history').then((r) => r.data),
  getAttempt: (attemptId: string) =>
    api.get(`/mock-tests/attempts/${attemptId}`).then((r) => r.data),
  startAttempt: (id: string) => api.post(`/mock-tests/${id}/start`).then((r) => r.data),
  saveProgress: (attemptId: string, data: any) =>
    api.patch(`/mock-tests/attempts/${attemptId}/progress`, data).then((r) => r.data),
  submitAttempt: (attemptId: string) =>
    api.post(`/mock-tests/attempts/${attemptId}/submit`).then((r) => r.data),
};

// ── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  createPayment: (planIndex: number) =>
    api.post('/payments/create', { planIndex }).then((r) => r.data),
  getMyPayments: () => api.get('/payments/my').then((r) => r.data),
  adminListAll: () => api.get('/payments/admin/all').then((r) => r.data),
  adminVerify: (id: string) =>
    api.patch(`/payments/admin/${id}/verify`).then((r) => r.data),
  adminReject: (id: string, note?: string) =>
    api.patch(`/payments/admin/${id}/reject`, { note }).then((r) => r.data),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/stats').then((r) => r.data),
  listUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }).then((r) => r.data),
  getUser: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data),
  updateUser: (id: string, data: { plan?: string; role?: string; fullName?: string }) =>
    api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  getUserMockTests: (id: string) =>
    api.get(`/admin/users/${id}/mock-tests`).then((r) => r.data),
};

export default api;
