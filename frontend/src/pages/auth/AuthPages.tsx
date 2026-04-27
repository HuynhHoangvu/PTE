import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plane, GraduationCap, Globe, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { LUX } from '../../theme/luxuryPalette';
import { formatAuthError } from '../../utils/authErrors';
import { GoogleSignIn } from '../../components/auth/GoogleSignIn';

// ── Shared layout ─────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex" style={{ background: LUX.charcoal }}>

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-10 relative overflow-hidden motion-safe:animate-fade-in">
        {/* Decorative bg */}
        <div className="absolute inset-0"
             style={{ background: `linear-gradient(180deg, ${LUX.charcoal} 0%, ${LUX.charcoalDeep} 100%)` }} />
        <div className="absolute top-1/4 left-0 w-80 h-80 rounded-full blur-3xl"
             style={{ background: 'rgba(253,213,47,0.12)' }} />
        <div className="absolute bottom-1/4 right-0 w-56 h-56 rounded-full blur-3xl"
             style={{ background: 'rgba(242,238,140,0.1)' }} />
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.07]"
             style={{ backgroundImage: `radial-gradient(circle, ${LUX.goldBright} 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: `linear-gradient(135deg, ${LUX.gold}, ${LUX.goldBright})` }}>
            <Plane size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black text-[18px] leading-none">
              <span style={{ background: `linear-gradient(90deg,${LUX.cream},${LUX.goldPale})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FLY
              </span>
              <span className="text-white"> ACADEMY</span>
            </div>
            <div className="text-[9px] text-gray-500 font-medium mt-0.5">PTE Academic Platform</div>
          </div>
        </div>

        {/* Center hero */}
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
               style={{ background: 'rgba(253,213,47,0.1)', border: '1px solid rgba(253,213,47,0.28)' }}>
            <GraduationCap size={32} style={{ color: LUX.goldBright }} />
          </div>
          <h1 className="font-display font-black text-3xl text-white leading-tight mb-3">
            Chinh phục<br />
            <span style={{ background: `linear-gradient(90deg,${LUX.cream},${LUX.goldBright},${LUX.goldPale})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PTE Academic
            </span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Nền tảng luyện thi PTE với AI chấm điểm thông minh, ngân hàng câu hỏi phong phú và phân tích chi tiết.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              '10,000+ câu hỏi thực tế',
              'AI chấm điểm tức thì',
              'Mock test theo chuẩn PTE',
              'Phân tích âm học chuyên sâu',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <CheckCircle2 size={15} style={{ color: LUX.goldBright }} />
                <span className="text-sm text-gray-400">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom globe */}
        <div className="relative z-10 flex items-center gap-2 text-gray-600">
          <Globe size={13} />
          <span className="text-xs">flypte.up.railway.app</span>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
           style={{ background: 'linear-gradient(175deg, #fffdf8 0%, #fefce8 50%, #fdf6d9 100%)' }}>
        <div className="w-full max-w-md motion-safe:animate-fade-in-up motion-safe:delay-100">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, ${LUX.gold}, ${LUX.goldBright})` }}>
              <Plane size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-black text-[18px]">
              <span style={{ background: `linear-gradient(90deg,${LUX.gold},${LUX.goldBright})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FLY</span>
              <span className="text-brand-black"> ACADEMY</span>
            </span>
          </div>

          <h2
            className={clsx(
              'font-display font-black text-2xl text-brand-black',
              subtitle != null && subtitle !== '' ? 'mb-1' : 'mb-6',
            )}
          >
            {title}
          </h2>
          {subtitle != null && subtitle !== '' && (
            <p className="text-sm text-gray-500 mb-7">{subtitle}</p>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Input({
  label, type = 'text', value, onChange, placeholder, error, icon: Icon, rightElement,
  autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string;
  icon?: React.ElementType;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <Icon size={15} className="text-gray-400" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={clsx(
            'w-full bg-white border rounded-xl py-3 text-sm text-gray-900',
            'placeholder-gray-400 outline-none transition-all',
            Icon ? 'pl-10 pr-4' : 'px-4',
            rightElement ? 'pr-10' : '',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15'
          )}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{error}</p>}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const em = email.trim();
    if (!em) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    try {
      await login(em, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(formatAuthError(err));
    }
  };

  return (
    <AuthLayout title="Chào mừng trở lại!">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com" icon={Mail}
          autoComplete="email"
        />
        <Input
          label="Mật khẩu" type={showPwd ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" icon={Lock}
          autoComplete="current-password"
          rightElement={
            <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 shadow-gold-md hover:shadow-gold-lg
                     hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${LUX.gold}, ${LUX.goldBright})` }}
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Plane size={15} />
          }
          Đăng nhập
        </button>
      </form>

      <GoogleSignIn variant="login" onError={setError} />

      <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold hover:underline" style={{ color: LUX.gold }}>
          Đăng ký ngay
        </Link>
      </div>
    </AuthLayout>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', fullName: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error,   setError]   = useState('');

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Mật khẩu không khớp'); return; }
    if (form.password.length < 6)       { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    const em = form.email.trim();
    if (!em) { setError('Vui lòng nhập email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('Email không hợp lệ.'); return; }
    if (!form.fullName.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    try {
      await register(em, form.fullName.trim(), form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(formatAuthError(err));
    }
  };

  return (
    <AuthLayout title="Tạo tài khoản">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Họ và tên" value={form.fullName} onChange={set('fullName')}
               placeholder="Nguyễn Văn A" icon={User} autoComplete="name" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')}
               placeholder="your@email.com" icon={Mail} autoComplete="email" />
        <Input
          label="Mật khẩu" type={showPwd ? 'text' : 'password'} value={form.password}
          onChange={set('password')} placeholder="Tối thiểu 6 ký tự" icon={Lock}
          autoComplete="new-password"
          rightElement={
            <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
        <Input label="Xác nhận mật khẩu" type={showPwd ? 'text' : 'password'}
               value={form.confirm} onChange={set('confirm')}
               placeholder="••••••••" icon={Lock} autoComplete="new-password" />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 shadow-gold-md hover:shadow-gold-lg
                     hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${LUX.gold}, ${LUX.goldBright})` }}
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <GraduationCap size={15} />
          }
          Tạo tài khoản
        </button>
      </form>

      <GoogleSignIn variant="register" onError={setError} />

      <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-bold hover:underline" style={{ color: LUX.gold }}>
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}
