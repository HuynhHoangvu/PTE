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

          <h2 className="font-bold text-lg text-gray-900 mt-4">2. Dịch vụ Trí tuệ Nhân tạo (AI) và Chia sẻ Dữ liệu với Bên Thứ Ba / Artificial Intelligence (AI) Services and Third-Party Data Sharing</h2>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800">BẢN TIẾNG VIỆT:</p>
              <p>
                Để vận hành các tính năng AI (như chấm điểm tự động bài nói Speaking), ứng dụng của chúng tôi có tích hợp và truyền tải một số dữ liệu nhất định của người dùng đến nhà cung cấp dịch vụ AI của bên thứ ba.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Dữ liệu nào được gửi đi:</strong> Khi bạn tương tác với các tính năng AI hoặc thực hiện ghi âm bài nói (Speaking), tệp dữ liệu âm thanh giọng nói của bạn sẽ được truyền đi. Chúng tôi không gửi bất kỳ dữ liệu nền, thông tin tài khoản hoặc thông tin tài chính cá nhân nào khác.</li>
                <li><strong>Dữ liệu được gửi đến ai:</strong> Dữ liệu này được gửi một cách an toàn đến đối tác xử lý AI bên thứ ba đáng tin cậy của chúng tôi: <strong>OpenAI, LLC</strong>.</li>
                <li><strong>Mục đích xử lý dữ liệu:</strong> Dữ liệu được sử dụng duy nhất cho mục đích xử lý yêu cầu của bạn, phân tích phát âm, phản hồi lỗi sai từ AI theo thời gian thực và cung cấp chức năng cốt lõi của tính năng luyện thi trong ứng dụng.</li>
                <li><strong>Bảo mật và Bảo vệ dữ liệu:</strong> Chúng tôi đảm bảo đối tác AI bên thứ ba cung cấp các tiêu chuẩn bảo vệ quyền riêng tư tương đương. Dữ liệu truyền đi được mã hóa an toàn và theo thỏa thuận của chúng tôi với nhà cung cấp, các dữ liệu này sẽ <strong>không</strong> được sử dụng để huấn luyện (train) các mô hình học máy công khai của họ.</li>
              </ul>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-800">ENGLISH VERSION:</p>
              <p>
                To power our AI features (such as Speaking AI grading), our application integrates and transmits certain user data to third-party AI service providers.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>What data is sent:</strong> When you interact with our AI features or record your speech for Speaking exercises, your voice recording audio data is transmitted. We do not transmit any other personal background data, accounts, or financial information.</li>
                <li><strong>Who the data is sent to:</strong> This data is securely sent to our trusted third-party AI processing partner: <strong>OpenAI, LLC</strong>.</li>
                <li><strong>Purpose of data processing:</strong> The data is used solely to process your requests, analyze your pronunciation, generate real-time AI feedback, and deliver the core functionality of the AI features within the app.</li>
                <li><strong>Data Protection & Security:</strong> We ensure that our third-party AI partner provides the same or equal levels of privacy protections. Your transmitted data is handled securely, encrypted in transit, and according to our agreement with the provider, your inputs will <strong>not</strong> be used to train their public machine learning models without your explicit consent.</li>
              </ul>
            </div>
          </div>

          <h2 className="font-bold text-lg text-gray-900 mt-4">3. Thông tin cá nhân khác</h2>
          <p>
            Chúng tôi có thể thu thập các thông tin cơ bản như Tên, Email khi bạn đăng ký tài khoản. Những dữ liệu này chỉ được dùng để đồng bộ hóa quá trình học tập của bạn trên các thiết bị.
          </p>

          <h2 className="font-bold text-lg text-gray-900 mt-4">4. Cam kết bảo mật</h2>
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
