import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { MButton, MInput } from "../ui";
import { logoUrl } from "../../assets";
import { formatAuthError } from "../../utils/authErrors";

export function MLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanSuccess, setScanSuccess] = React.useState(false);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem("fly_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem("fly_remember_email", email);
      } else {
        localStorage.removeItem("fly_remember_email");
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    }
  };

  const hasBiometrics = localStorage.getItem("fly_biometrics_enabled") === "true";

  const handleBiometricLogin = () => {
    const token = localStorage.getItem("fly_biometric_token");
    const userStr = localStorage.getItem("fly_biometric_user");

    if (!token || !userStr) {
      alert("Không tìm thấy thông tin sinh trắc học đã lưu. Vui lòng đăng nhập bằng mật khẩu trước và kích hoạt Face ID trong Cài đặt.");
      return;
    }

    setIsScanning(true);
    setScanSuccess(false);

    // Simulate Face ID / Touch ID hardware scan on iOS
    setTimeout(() => {
      setScanSuccess(true);
      setTimeout(() => {
        const user = JSON.parse(userStr);
        localStorage.setItem("fly_edu_token", token);
        useAuthStore.setState({ user, token });
        setIsScanning(false);
        navigate("/dashboard", { replace: true });
      }, 800);
    }, 1200);
  };

  return (
    <div
      className="mobile-page-full flex flex-col relative"
      style={{ background: "linear-gradient(175deg, #fffdf8 0%, #fef9e7 60%, #fdf6d9 100%)" }}
    >
      {/* Biometric Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl motion-safe:animate-fade-in-up">
            <div className="text-4xl animate-pulse">
              {scanSuccess ? "✅" : "👤"}
            </div>
            <h3 className="font-display font-bold text-lg text-gray-900">
              {scanSuccess ? "Xác thực thành công" : "Xác thực Face ID / Touch ID"}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {scanSuccess
                ? "Đang đăng nhập vào hệ thống..."
                : "Vui lòng nhìn vào camera hoặc đặt ngón tay lên cảm biến để tiếp tục."}
            </p>
            {!scanSuccess && (
              <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="text-xs text-gray-400 font-bold hover:text-gray-600 underline pt-2"
              >
                Huỷ bỏ
              </button>
            )}
          </div>
        </div>
      )}

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

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 text-xs text-gray-500 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  style={{ accentColor: '#eab308' }}
                />
                Nhớ tài khoản
              </label>
            </div>

            <div className="flex gap-2.5 mt-2">
              <MButton
                type="submit"
                variant="primary"
                loading={isLoading}
                className="flex-1"
              >
                Đăng nhập
              </MButton>
              
              {hasBiometrics && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-12 h-12 rounded-2xl border border-brand-gold/20 flex items-center justify-center bg-amber-50 hover:bg-amber-100 active:scale-95 transition-all text-xl shadow-sm"
                  title="Đăng nhập sinh trắc học"
                >
                  🆔
                </button>
              )}
            </div>
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
  const [agree, setAgree] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agree) {
      setError("Bạn phải đồng ý với Điều khoản sử dụng và Chính sách bảo mật để tiếp tục.");
      return;
    }
    try {
      await register(email, fullName, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(formatAuthError(err));
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
            
            <div className="flex items-start gap-2.5 py-1">
              <input
                id="agree-checkbox"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold mt-0.5"
                style={{ accentColor: '#eab308' }}
                required
              />
              <label htmlFor="agree-checkbox" className="text-xs text-gray-500 leading-normal select-none">
                Tôi đồng ý với{" "}
                <Link to="/terms" className="font-semibold text-brand-gold underline">
                  Điều khoản sử dụng
                </Link>{" "}
                và{" "}
                <Link to="/privacy" className="font-semibold text-brand-gold underline">
                  Chính sách bảo mật
                </Link>{" "}
                của FLY Academy.
              </label>
            </div>

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
