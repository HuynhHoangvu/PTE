import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/Sidebar';
import { Button } from '../components/ui';

const FREE_FEATURES = [
  '50 câu hỏi luyện tập / ngày',
  'AI chấm điểm Speaking cơ bản',
  'Mock Test: 2 đề / tháng',
  'Bookmark câu hỏi (localStorage)',
  'Xem điểm & lịch sử',
];

const PREMIUM_FEATURES = [
  'Không giới hạn câu hỏi luyện tập',
  'AI chấm điểm Speaking nâng cao (chi tiết)',
  'Mock Test: không giới hạn + full timed exam',
  'Transcript chi tiết + phân tích lỗi phát âm',
  'Lộ trình học cá nhân hoá',
  'Đề thi thật (Repeated questions)',
  'Priority support 24/7',
  'Xuất báo cáo PDF',
];

export default function PremiumPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F7F6F3]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-0 z-30">
          <h1 className="font-display font-black text-lg">⭐ Premium</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>← Dashboard</Button>
        </div>

        <div className="px-8 py-12 max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-yellow/20 border border-brand-yellow/40 rounded-full px-4 py-1.5 mb-4">
              <span className="text-sm font-black text-brand-black">🚀 Sắp ra mắt</span>
            </div>
            <h2 className="font-display font-black text-4xl text-gray-900 mb-3">
              Nâng cấp lên <span className="text-brand-yellow">Premium</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Mở khóa toàn bộ tính năng để đạt điểm PTE mục tiêu nhanh hơn với AI chấm điểm chuyên sâu.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Free */}
            <div className="card p-7">
              <div className="mb-5">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Free</span>
                <div className="font-display font-black text-3xl text-gray-900 mt-1">0₫
                  <span className="text-sm font-normal text-gray-400 ml-1">/ tháng</span>
                </div>
              </div>
              <ul className="space-y-3 mb-7">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="w-full" disabled>Gói hiện tại</Button>
            </div>

            {/* Premium */}
            <div className="relative card p-7 border-2 border-brand-yellow shadow-lg overflow-hidden">
              {/* Popular badge */}
              <div className="absolute top-0 right-0 bg-brand-yellow text-brand-black text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-wide">
                Phổ biến nhất
              </div>

              <div className="mb-5">
                <span className="text-xs font-black uppercase tracking-widest text-brand-yellow">Premium</span>
                <div className="font-display font-black text-3xl text-gray-900 mt-1">
                  <span className="text-lg text-gray-400 line-through mr-2">599.000₫</span>
                  299.000₫
                  <span className="text-sm font-normal text-gray-400 ml-1">/ tháng</span>
                </div>
                <p className="text-xs text-green-600 font-bold mt-1">🎉 Ra mắt sớm — giảm 50%</p>
              </div>

              <ul className="space-y-3 mb-7">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 font-medium">
                    <span className="text-brand-yellow mt-0.5 flex-shrink-0 font-black">★</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button variant="yellow" className="w-full py-3 text-base" onClick={() => {}}>
                Đăng ký Premium →
              </Button>
              <p className="text-[10px] text-center text-gray-400 mt-3">Tính năng thanh toán sẽ ra mắt sớm</p>
            </div>
          </div>

          {/* Coming soon notice */}
          <div className="card p-6 bg-brand-black text-center">
            <p className="text-2xl mb-2">⏳</p>
            <h3 className="font-display font-black text-white text-lg mb-2">Tính năng đang phát triển</h3>
            <p className="text-gray-400 text-sm mb-4">
              Hệ thống thanh toán Premium đang được xây dựng. Bạn sẽ nhận thông báo khi ra mắt.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="yellow" onClick={() => navigate('/practice/speaking')}>
                Luyện tập ngay (Free) →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
