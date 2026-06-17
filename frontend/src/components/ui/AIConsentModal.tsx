import React from "react";

interface AIConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ isOpen, onAccept, onDecline }: AIConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center motion-safe:animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-3xl">
          🎙️
        </div>
        <h3 className="font-display font-black text-lg text-gray-900">
          Quyền riêng tư & Chấm điểm AI
        </h3>
        <div className="text-xs text-gray-500 text-left leading-relaxed space-y-2">
          <p>
            Để chấm điểm và sửa lỗi phát âm phần thi <strong>Speaking</strong>, ứng dụng sẽ ghi âm giọng nói của bạn và gửi dữ liệu âm thanh này sang dịch vụ trí tuệ nhân tạo (AI) của bên thứ ba (OpenAI Whisper & GPT).
          </p>
          <p>
            <strong>Thông tin cam kết bảo mật:</strong>
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Dữ liệu âm thanh của bạn được truyền tải và lưu trữ an toàn bằng giao thức mã hóa.</li>
            <li>Dữ liệu chỉ dùng để phân tích và tính toán điểm số bài làm của bạn.</li>
            <li>Không sử dụng giọng nói của bạn để huấn luyện mô hình AI hoặc chia sẻ cho mục đích thương mại khác.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onAccept}
            className="w-full py-3 rounded-xl font-bold text-sm text-white hover:brightness-115 transition-all shadow-sm"
            style={{ backgroundColor: "#eab308" }}
          >
            Đồng ý và tiếp tục
          </button>
          <button
            onClick={onDecline}
            className="w-full py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
