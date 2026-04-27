import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { formatAuthError } from '../../utils/authErrors';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}
/**
 * Khối đăng nhập Google (GIS) — luôn hiển thị trên màn hình.
 * Có `VITE_GOOGLE_CLIENT_ID` → nút Google thật; chưa có → hộp hướng dẫn cấu hình.
 */
export function GoogleSignIn({
  onError,
  variant = 'login',
}: {
  onError: (msg: string) => void;
  variant?: 'login' | 'register';
}) {
  const navigate = useNavigate();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const divRef = useRef<HTMLDivElement>(null);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();

  useEffect(() => {
    if (!clientId || !divRef.current) return;

    const callback = async (response: { credential: string }) => {
      try {
        await loginWithGoogle(response.credential);
        navigate('/dashboard');
      } catch (e: unknown) {
        onError(formatAuthError(e));
      }
    };

    const render = () => {
      const el = divRef.current;
      if (!el || !window.google?.accounts?.id) return;
      el.innerHTML = '';
      window.google.accounts.id.initialize({ client_id: clientId, callback });
      window.google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 48 : 320),
        text: 'signin_with',
        locale: 'vi',
      });
    };

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.id) render();
      else existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [clientId, loginWithGoogle, navigate, onError]);

  return (
    <div className="mt-6 border-t border-gray-200/90 pt-6">
      {clientId ? (
        <div ref={divRef} className="flex min-h-[48px] justify-center" />
      ) : (
        <div className="rounded-xl border border-dashed border-amber-300 bg-white/70 px-3 py-3 text-center text-[11px] leading-relaxed text-amber-900">
          <p className="mb-1 font-bold">Chưa gắn Client ID</p>
          <p>
            Thêm <code className="rounded bg-amber-100/90 px-1 font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID</code>{' '}
            (build frontend) và <code className="rounded bg-amber-100/90 px-1 font-mono text-[10px]">GOOGLE_CLIENT_ID</code>{' '}
            (backend) cùng một Web Client ID từ Google Cloud Console → Authorized JavaScript origins gồm URL trang này.
          </p>
        </div>
      )}
    </div>
  );
}
