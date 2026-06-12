import axios from 'axios';

/** Nest validation / auth; mạng lỗi không có response */
export function formatAuthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string' && msg.trim()) {
      const lower = msg.toLowerCase();
      if (
        lower.includes('invalid credentials') ||
        lower.includes('wrong password') ||
        lower.includes('user not found')
      ) {
        return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      }
      if (lower.includes('email already exists') || lower.includes('email must be unique')) {
        return 'Email này đã được đăng ký trên hệ thống.';
      }
      if (msg.includes('Token Google không hợp lệ')) {
        return 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.';
      }
      return msg;
    }
    if (!err.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng (Internet/Wifi/3G/4G) của điện thoại hoặc thử lại sau.';
    }
  }
  return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
}
