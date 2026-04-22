import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui';
import { clsx } from 'clsx';

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      {/* BG decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 bg-brand-yellow rounded-xl flex items-center justify-center text-2xl">✈️</div>
            <span className="font-display font-black text-2xl text-white">Fly<span className="text-brand-yellow">Edu</span></span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-brand-dark2 rounded-2xl border border-brand-dark p-7 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, error }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={clsx(
          'w-full bg-brand-black/50 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all',
          error ? 'border-red-500 focus:border-red-400' : 'border-brand-dark focus:border-brand-yellow'
        )}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <AuthLayout title="Chào mừng trở lại!" subtitle="Đăng nhập để tiếp tục luyện tập PTE Academic">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="your@email.com" />
        <Input label="Mật khẩu" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" />
        {error && <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>}
        <Button type="submit" variant="yellow" className="w-full py-3 text-base" loading={isLoading}>
          Đăng nhập
        </Button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-5">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-brand-yellow font-bold hover:underline">Đăng ký ngay</Link>
      </p>
    </AuthLayout>
  );
}

// ── Register ───────────────────────────────────────────────────────────────
export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', fullName: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const set = (key: string) => (e: any) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Mật khẩu không khớp'); return; }
    if (form.password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
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
        <Input label="Họ và tên" value={form.fullName} onChange={set('fullName')} placeholder="Nguyễn Văn A" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
        <Input label="Mật khẩu" type="password" value={form.password} onChange={set('password')} placeholder="Tối thiểu 6 ký tự" />
        <Input label="Xác nhận mật khẩu" type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />
        {error && <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>}
        <Button type="submit" variant="yellow" className="w-full py-3 text-base" loading={isLoading}>
          Đăng ký
        </Button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-5">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-brand-yellow font-bold hover:underline">Đăng nhập</Link>
      </p>
    </AuthLayout>
  );
}
