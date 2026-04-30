import React from "react";
import { useNavigate } from "react-router-dom";
import { logoUrl } from "../../assets";

export function MPrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div
      className="mobile-page-full flex flex-col overflow-y-auto"
      style={{ background: "#fef9e7" }}
    >
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-900"
          >
            ← Quay lại
          </button>
          <img src={logoUrl} alt="FLY Academy" className="h-8 w-auto" />
        </div>

        <div className="m-card-elevated rounded-3xl p-6 bg-white space-y-4 text-gray-800 text-sm leading-relaxed shadow-sm">
          <h1 className="font-display font-black text-2xl text-gray-900 mb-4 border-b pb-2">
            Chính Sách Quyền Riêng Tư
          </h1>
          
          <p>
            Chào mừng bạn đến với ứng dụng <strong>FLY PTE Academy</strong>. Việc bảo vệ dữ liệu cá nhân của bạn là ưu tiên hàng đầu của chúng tôi. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
          </p>

          <h2 className="font-bold text-lg text-gray-900 mt-4">1. Quyền truy cập Microphone (Ghi âm)</h2>
          <p>
            Ứng dụng của chúng tôi yêu cầu quyền sử dụng Microphone (<code>RECORD_AUDIO</code>) với mục đích duy nhất là <strong>thu âm giọng nói của bạn trong các bài thi Speaking của PTE</strong> (ví dụ: Read Aloud, Repeat Sentence, v.v.).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dữ liệu âm thanh của bạn sẽ được mã hóa và gửi đến máy chủ (AI) để tiến hành chấm điểm và phân tích năng lực phát âm, độ trôi chảy.</li>
            <li>Chúng tôi <strong>không</strong> thu thập âm thanh chạy ngầm và <strong>chỉ</strong> ghi âm khi bạn chủ động nhấn nút bắt đầu ghi âm trong bài tập.</li>
            <li>Sau khi chấm điểm, file âm thanh có thể được lưu trữ bảo mật để bạn nghe lại lịch sử luyện tập của mình và sẽ không bao giờ được chia sẻ cho bên thứ ba vì mục đích quảng cáo.</li>
          </ul>

          <h2 className="font-bold text-lg text-gray-900 mt-4">2. Thông tin cá nhân khác</h2>
          <p>
            Chúng tôi có thể thu thập các thông tin cơ bản như Tên, Email khi bạn đăng ký tài khoản. Những dữ liệu này chỉ được dùng để đồng bộ hóa quá trình học tập của bạn trên các thiết bị.
          </p>

          <h2 className="font-bold text-lg text-gray-900 mt-4">3. Cam kết bảo mật</h2>
          <p>
            FLY PTE Academy cam kết tuân thủ các tiêu chuẩn bảo mật dữ liệu hiện hành. Mọi dữ liệu truyền tải giữa ứng dụng và máy chủ đều được mã hóa an toàn.
          </p>

          <p className="mt-8 text-xs text-gray-500 italic">
            Cập nhật lần cuối: Tháng 5 năm 2026. Nếu bạn có thắc mắc, vui lòng liên hệ với bộ phận hỗ trợ của FLY PTE.
          </p>
        </div>
      </div>
    </div>
  );
}
