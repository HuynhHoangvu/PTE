import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authApi } from '../api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authApi.login({ email, password });
          localStorage.setItem('fly_edu_token', token);
          set({ user, token, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (email, fullName, password) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authApi.register({ email, fullName, password });
          localStorage.setItem('fly_edu_token', token);
          set({ user, token, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => {
        localStorage.removeItem('fly_edu_token');
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'fly-edu-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
