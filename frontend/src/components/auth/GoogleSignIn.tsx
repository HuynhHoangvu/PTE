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
 * Khối đăng nhập Google (GIS). Chỉ hiển thị khi build có `VITE_GOOGLE_CLIENT_ID`.
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
  const [initError, setInitError] = React.useState<string | null>(null);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();

  useEffect(() => {
    if (!clientId || !divRef.current) return;
    setInitError(null);

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
      try {
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
      } catch {
        const msg =
          'Google Sign-In chưa sẵn sàng. Kiểm tra Authorized JavaScript origins (localhost:5173 / domain production) trong Google Cloud Console.';
        setInitError(msg);
        onError(msg);
      }
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
    script.onerror = () => {
      const msg = 'Không tải được Google Sign-In script. Kiểm tra mạng hoặc chặn script trên trình duyệt.';
      setInitError(msg);
      onError(msg);
    };
    document.body.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId, loginWithGoogle, navigate, onError]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-gray-200/90 pt-6">
      <div ref={divRef} className="flex min-h-[48px] justify-center" />
      {initError && (
        <p className="mt-2 text-xs text-amber-700 text-center">
          {initError}
        </p>
      )}
    </div>
  );
}
