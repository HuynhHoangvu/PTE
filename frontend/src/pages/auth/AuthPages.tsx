import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plane, GraduationCap, Globe, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui';
import { clsx } from 'clsx';

// ── Shared layout ─────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A12' }}>

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative bg */}
        <div className="absolute inset-0"
             style={{ background: 'linear-gradient(160deg, #0A0A12 0%, #1A1A28 100%)' }} />
        <div className="absolute top-1/4 left-0 w-80 h-80 rounded-full blur-3xl"
             style={{ background: 'rgba(200,149,42,0.12)' }} />
        <div className="absolute bottom-1/4 right-0 w-56 h-56 rounded-full blur-3xl"
             style={{ background: 'rgba(200,149,42,0.08)' }} />
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'radial-gradient(circle, #C8952A 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #C8952A, #E8B84B)' }}>
            <Plane size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black text-[18px] leading-none">
              <span style={{ background: 'linear-gradient(90deg,#C8952A,#F0D060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FLY
              </span>
              <span className="text-white"> ACADEMY</span>
            </div>
            <div className="text-[9px] text-gray-600 font-medium mt-0.5">PTE Academic Platform</div>
          </div>
        </div>

        {/* Center hero */}
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
               style={{ background: 'rgba(200,149,42,0.15)', border: '1px solid rgba(200,149,42,0.25)' }}>
            <GraduationCap size={32} style={{ color: '#C8952A' }} />
          </div>
          <h1 className="font-display font-black text-3xl text-white leading-tight mb-3">
            Chinh phục<br />
            <span style={{ background: 'linear-gradient(90deg,#C8952A,#F0D060,#C8952A)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                <CheckCircle2 size={15} style={{ color: '#C8952A' }} />
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
           style={{ background: '#F8F7F4' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #C8952A, #E8B84B)' }}>
              <Plane size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-black text-[18px]">
              <span style={{ background: 'linear-gradient(90deg,#C8952A,#F0D060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FLY</span>
              <span className="text-brand-black"> ACADEMY</span>
            </span>
          </div>

          <h2 className="font-display font-black text-2xl text-brand-black mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-7">{subtitle}</p>

          {children}
        </div>
      </div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Input({
  label, type = 'text', value, onChange, placeholder, error, icon: Icon, rightElement,
}: {
  label: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string;
  icon?: React.ElementType;
  rightElement?: React.ReactNode;
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
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không đúng');
    }
  };

  return (
    <AuthLayout title="Chào mừng trở lại!" subtitle="Đăng nhập để tiếp tục luyện tập PTE Academic">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com" icon={Mail}
        />
        <Input
          label="Mật khẩu" type={showPwd ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" icon={Lock}
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
          style={{ background: 'linear-gradient(135deg, #C8952A, #E8B84B)' }}
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Plane size={15} />
          }
          Đăng nhập
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold hover:underline" style={{ color: '#C8952A' }}>
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
    try {
      await register(form.email, form.fullName, form.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Bắt đầu hành trình chinh phục PTE Academic">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Họ và tên" value={form.fullName} onChange={set('fullName')}
               placeholder="Nguyễn Văn A" icon={User} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')}
               placeholder="your@email.com" icon={Mail} />
        <Input
          label="Mật khẩu" type={showPwd ? 'text' : 'password'} value={form.password}
          onChange={set('password')} placeholder="Tối thiểu 6 ký tự" icon={Lock}
          rightElement={
            <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
        <Input label="Xác nhận mật khẩu" type={showPwd ? 'text' : 'password'}
               value={form.confirm} onChange={set('confirm')}
               placeholder="••••••••" icon={Lock} />

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
          style={{ background: 'linear-gradient(135deg, #C8952A, #E8B84B)' }}
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <GraduationCap size={15} />
          }
          Tạo tài khoản
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-bold hover:underline" style={{ color: '#C8952A' }}>
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}
