import { useNavigate } from "react-router-dom";
import { logoUrl } from "../../assets";

export function MTermsPage() {
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

        <div className="m-card-elevated rounded-3xl bg-white p-6 text-sm leading-relaxed text-gray-800 shadow-sm space-y-4">
          <h1 className="font-display text-2xl font-black text-gray-900 border-b pb-2">
            Điều Khoản Sử Dụng
          </h1>

          <p>
            Khi sử dụng ứng dụng <strong>FLY PTE Academy</strong>, bạn đồng ý
            tuân thủ các điều khoản dưới đây để đảm bảo môi trường học tập an
            toàn, công bằng và hiệu quả.
          </p>

          <h2 className="mt-4 text-lg font-bold text-gray-900">1. Tài khoản người dùng</h2>
          <p>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động
            phát sinh từ tài khoản của mình. Vui lòng không chia sẻ tài khoản
            cho người khác khi chưa có sự đồng ý của FLY PTE Academy.
          </p>

          <h2 className="mt-4 text-lg font-bold text-gray-900">2. Nội dung luyện tập</h2>
          <p>
            Tài liệu, bài luyện tập, kết quả chấm điểm và phản hồi AI trong ứng
            dụng chỉ phục vụ mục đích học tập cá nhân. Bạn không được sao chép,
            phân phối lại hoặc sử dụng cho mục đích thương mại khi chưa được
            cho phép.
          </p>

          <h2 className="mt-4 text-lg font-bold text-gray-900">3. Sử dụng dịch vụ</h2>
          <p>
            Người dùng cần sử dụng ứng dụng đúng mục đích, không can thiệp vào
            hệ thống, không khai thác lỗi kỹ thuật và không thực hiện hành vi
            ảnh hưởng đến trải nghiệm của người dùng khác.
          </p>

          <h2 className="mt-4 text-lg font-bold text-gray-900">4. Thay đổi điều khoản</h2>
          <p>
            FLY PTE Academy có thể cập nhật điều khoản sử dụng để phù hợp với
            sản phẩm và quy định hiện hành. Các thay đổi quan trọng sẽ được
            thông báo trong ứng dụng khi cần thiết.
          </p>

          <p className="mt-8 text-xs italic text-gray-500">
            Cập nhật lần cuối: Tháng 5 năm 2026. Nếu bạn có thắc mắc, vui lòng
            liên hệ với bộ phận hỗ trợ của FLY PTE.
          </p>
        </div>
      </div>
    </div>
  );
}
