import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { paymentsApi } from "../../api";
import { logoUrl } from "../../assets";
import { useAuthStore } from "../../stores/authStore";
import { MobileBackHeader } from "../layout/MobileShell";
import { MButton, MBadge } from "../ui";
import { clsx } from "clsx";
import { Capacitor } from "@capacitor/core";

const PLANS = [
  {
    index: 0,
    name: "1 tháng",
    price: "299.000đ",
    priceNum: 299000,
    per: "/ tháng",
    badge: null as string | null,
    features: ["AI chấm không giới hạn", "Toàn bộ ngân hàng câu", "Mock test đầy đủ"],
  },
  {
    index: 1,
    name: "3 tháng",
    price: "699.000đ",
    priceNum: 699000,
    per: "/ 3 tháng",
    badge: "Tiết kiệm 22%",
    features: ["AI chấm không giới hạn", "Toàn bộ ngân hàng câu", "Mock test đầy đủ", "Ưu tiên hỗ trợ"],
  },
  {
    index: 2,
    name: "12 tháng",
    price: "1.999.000đ",
    priceNum: 1999000,
    per: "/ năm",
    badge: "Tiết kiệm 44%",
    features: ["AI chấm không giới hạn", "Toàn bộ ngân hàng câu", "Mock test đầy đủ", "Ưu tiên hỗ trợ", "Tài liệu luyện thi độc quyền"],
  },
];

export default function MPremiumPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isIOS = Capacitor.getPlatform() === "ios";

  const payMutation = useMutation({
    mutationFn: (planIndex: number) => paymentsApi.createPayment(planIndex),
    onSuccess: (data) => {
      if (data?.paymentUrl) window.location.href = data.paymentUrl;
    },
  });

  return (
    <div className="mobile-page-full">
      <MobileBackHeader title="Nâng cấp Premium" onBack={() => navigate(-1)} />

      <div className="practice-mobile-body px-4 pb-8 space-y-4">
        {/* Banner */}
        <div
          className="rounded-3xl p-5 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #fdd52f 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative z-10">
            <img src={logoUrl} alt="FLY Academy" className="h-14 w-auto mx-auto mb-3 brightness-0 invert opacity-90" />
            <h2 className="font-display font-black text-xl text-white mb-1">FLY Premium</h2>
            <p className="text-sm text-white/70">
              Luyện thi PTE không giới hạn với AI chấm thông minh
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="m-card-elevated rounded-3xl p-6 text-center space-y-3 bg-white">
            <p className="text-4xl">⭐</p>
            <p className="font-display font-black text-lg text-gray-900">Quyền truy cập Premium đã mở!</p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              Hệ thống đã kích hoạt toàn quyền ôn luyện nâng cao cho bạn. Bạn có thể sử dụng tất cả các bài thi thử, ngân hàng câu hỏi và chấm điểm AI hoàn toàn miễn phí.
            </p>
            <MButton variant="primary" fullWidth onClick={() => navigate(-1)}>
              Bắt đầu học ngay
            </MButton>
          </div>
        ) : user?.plan === "premium" ? (
          <div className="m-card-elevated rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-display font-bold text-lg text-gray-900">Bạn đang dùng Premium!</p>
            <p className="text-sm text-gray-500 mt-1">Cảm ơn bạn đã tin tưởng FLY Academy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <div
                key={plan.index}
                className={clsx(
                  "m-card-elevated rounded-2xl p-4 relative",
                  plan.badge && "ring-2 ring-brand-gold/50"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 left-4">
                    <MBadge color="gold">{plan.badge}</MBadge>
                  </div>
                )}
                <div className="flex items-start justify-between mt-1 mb-3">
                  <div>
                    <p className="font-display font-black text-base text-gray-900">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                       <span className="font-display font-black text-2xl text-brand-gold">
                        {plan.price}
                      </span>
                      <span className="text-xs text-gray-400">{plan.per}</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <MButton
                  variant={plan.badge ? "primary" : "secondary"}
                  fullWidth
                  loading={payMutation.isPending}
                  onClick={() => payMutation.mutate(plan.index)}
                >
                  Chọn gói {plan.name}
                </MButton>
              </div>
            ))}
          </div>
        )}

        {!isIOS && (
          <p className="text-center text-xs text-gray-400">
            Thanh toán an toàn · Hoàn tiền trong 7 ngày nếu không hài lòng
          </p>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
