import axios from 'axios';

/** Nest validation / auth; mạng lỗi không có response */
export function formatAuthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string' && msg.trim()) {
      if (msg.includes('Token Google không hợp lệ')) {
        return 'Đăng nhập Google thất bại. Kiểm tra GOOGLE_CLIENT_ID ở backend có trùng với VITE_GOOGLE_CLIENT_ID ở frontend.';
      }
      return msg;
    }
    if (!err.response) {
      return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy (port 3000) hoặc đặt BACKEND_URL trong `.env` khi chạy `npm run dev` (Vite proxy /api).';
    }
  }
  return 'Email hoặc mật khẩu không đúng';
}
