import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { MButton, MInput } from "../ui";
import { logoUrl } from "../../assets";

export function MLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Email hoặc mật khẩu không đúng.");
    }
  };

  return (
    <div
      className="mobile-page-full flex flex-col"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef9e7 60%, #fdf6d9 100%)" }}
    >
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-6">
        <img
          src={logoUrl}
          alt="FLY Academy"
          className="w-44 h-auto mb-2"
        />
        <p className="text-sm text-gray-500 text-center">Luyện thi PTE Academic · AI Chấm điểm</p>
      </div>

      {/* Form */}
      <div className="px-6 pb-8">
        <div className="m-card-elevated rounded-3xl p-6 space-y-4">
          <h2 className="font-display font-bold text-lg text-gray-900">Đăng nhập</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <MInput
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <MInput
              label="Mật khẩu"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-xs text-gray-500"
                >
                  {showPwd ? "Ẩn" : "Hiện"}
                </button>
              }
            />
            <MButton
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              className="mt-2"
            >
              Đăng nhập
            </MButton>
          </form>

          <p className="text-center text-sm text-gray-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-brand-gold font-bold">
              Đăng ký
            </Link>
          </p>

          <div className="rounded-2xl bg-gray-50/80 px-4 py-3 text-center text-[11px] leading-relaxed text-gray-500">
            <p>
              Đọc{" "}
              <Link to="/privacy" className="font-semibold text-brand-gold">
                Chính sách quyền riêng tư
              </Link>{" "}
              và{" "}
              <Link to="/terms" className="font-semibold text-brand-gold">
                Điều khoản sử dụng
              </Link>
              .
            </p>
            <p>
              Khi đăng nhập, bạn xác nhận đã đọc và đồng ý với các nội dung trên.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          FLY PTE Academy • Đồng hành cùng bạn đến 79+
        </p>
      </div>
    </div>
  );
}

export function MRegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(email, fullName, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Đăng ký thất bại, thử lại.");
    }
  };

  return (
    <div
      className="mobile-page-full flex flex-col"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef9e7 60%, #fdf6d9 100%)" }}
    >
      <div className="flex flex-col items-center px-6 pt-16 pb-6">
        <img src={logoUrl} alt="FLY Academy" className="w-36 h-auto mb-3" />
        <h1 className="font-display font-black text-2xl text-gray-900 mb-1">Tạo tài khoản</h1>
        <p className="text-sm text-gray-500">Bắt đầu hành trình PTE của bạn</p>
      </div>

      <div className="px-6 pb-8">
        <div className="m-card-elevated rounded-3xl p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <MInput
              label="Họ và tên"
              type="text"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <MInput
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <MInput
              label="Mật khẩu"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <MButton type="submit" variant="primary" fullWidth loading={isLoading} className="mt-2">
              Đăng ký miễn phí
            </MButton>
          </form>

          <p className="text-center text-sm text-gray-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-brand-gold font-bold">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
