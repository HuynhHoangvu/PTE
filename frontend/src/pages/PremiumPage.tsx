import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Crown, CheckCircle2, Clock, Zap, Shield, Star,
  Copy, CheckCheck, Plane, ChevronRight, XCircle,
  AlertCircle, RefreshCw, Lock, Info,
} from 'lucide-react';
import { paymentsApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { MainLayout } from '../components/layout/Sidebar';
import { Button } from '../components/ui';
import { LUX } from '../theme/luxuryPalette';
import { Capacitor } from '@capacitor/core';

const GOLD   = LUX.gold;
const GOLD_B = LUX.goldBright;

const PLANS = [
  {
    index:       0,
    name:        '20 ngày',
    days:        20,
    usd:         10,
    vnd:         249000,
    badge:       'Dùng thử',
    badgeColor:  'bg-gray-100 text-gray-600',
    highlight:   false,
    description: 'Trải nghiệm Premium không giới hạn',
  },
  {
    index:       1,
    name:        '150 ngày',
    days:        150,
    usd:         50,
    vnd:         1249000,
    badge:       'Phổ biến nhất',
    badgeColor:  'bg-brand-gold/15 text-brand-gold',
    highlight:   true,
    description: '5 tháng ôn luyện chuyên sâu',
  },
  {
    index:       2,
    name:        '300 ngày',
    days:        300,
    usd:         100,
    vnd:         2499000,
    badge:       'Tiết kiệm nhất',
    badgeColor:  'bg-green-100 text-green-700',
    highlight:   false,
    description: 'Trọn vẹn 10 tháng chinh phục PTE',
  },
];

const FEATURES = [
  'Không giới hạn câu hỏi luyện tập',
  'AI chấm điểm Speaking nâng cao & chi tiết',
  'Mock Test không giới hạn + full timed exam',
  'Transcript chi tiết + phân tích lỗi phát âm',
  'Đề thi thật (Repeated & Trending questions)',
  'Priority support 24/7',
];

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ── VietQR Payment Modal ───────────────────────────────────────────────────
function PaymentModal({ plan, onClose }: { plan: typeof PLANS[0]; onClose: () => void }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => paymentsApi.createPayment(plan.index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-payments'] }),
  });

  React.useEffect(() => {
    createMutation.mutate();
  }, []);

  const payment = createMutation.data;
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const qrUrl = payment
    ? `https://img.vietqr.io/image/TPB-04069584501-compact2.png?amount=${payment.amountVnd}&addInfo=${encodeURIComponent(payment.transferContent)}&accountName=FLY+ACADEMY`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Crown size={16} style={{ color: GOLD }} />
            <h2 className="font-display font-black text-lg">Thanh toán Premium</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <XCircle size={18} />
          </button>
        </div>

        {/* Plan summary */}
        <div className="mx-6 mt-5 rounded-xl px-4 py-3.5 flex items-center justify-between"
             style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.12), rgba(45,212,191,0.08))', border: '1px solid rgba(20,184,166,0.22)' }}>
          <div>
            <p className="text-xs font-bold text-gray-500">Gói đã chọn</p>
            <p className="font-display font-black text-base" style={{ color: GOLD }}>Premium {plan.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-black text-xl text-gray-900">{formatVND(plan.vnd)}</p>
            <p className="text-xs text-gray-400">≈ ${plan.usd} USD</p>
          </div>
        </div>

        {createMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: `${GOLD} transparent transparent transparent` }} />
            <p className="text-sm text-gray-500">Đang tạo đơn thanh toán...</p>
          </div>
        )}

        {payment && (
          <div className="px-6 py-5 space-y-5">

            {/* QR code */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Quét mã để chuyển khoản</p>
              <div className="rounded-2xl p-3 border-2 border-brand-gold/30 bg-white shadow-md">
                <img
                  src={qrUrl}
                  alt="VietQR TPBank"
                  className="w-52 h-52 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <img src="https://vietqr.io/img/VIETQR.svg" alt="VietQR" className="h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-[10px] text-gray-400 font-bold">TPBank — 04069584501</span>
              </div>
            </div>

            {/* Transfer info */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                Thông tin chuyển khoản
              </p>
              {[
                { label: 'Ngân hàng',      value: 'TPBank',                key: 'bank'    },
                { label: 'Số tài khoản',   value: '04069584501',           key: 'account' },
                { label: 'Chủ tài khoản',  value: 'FLY ACADEMY',           key: 'name'    },
                { label: 'Số tiền',        value: formatVND(payment.amountVnd), key: 'amount'  },
                { label: 'Nội dung',       value: payment.transferContent, key: 'content', highlight: true },
              ].map(({ label, value, key, highlight }) => (
                <div key={key} className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0', highlight && 'bg-brand-gold-light/90')}>
                  <span className="text-xs text-gray-500 font-semibold">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className={clsx('text-sm font-bold', highlight ? 'text-brand-gold' : 'text-gray-800')}>{value}</span>
                    <button
                      onClick={() => copy(value, key)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      {copied === key ? <CheckCheck size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Important notice */}
            <div className="rounded-xl px-4 py-3.5 flex gap-3"
                 style={{ background: 'rgba(228,168,8,0.1)', border: '1px solid rgba(253,213,47,0.35)' }}>
              <AlertCircle size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
              <div className="text-xs text-gray-700 space-y-1">
                <p className="font-black" style={{ color: GOLD }}>Lưu ý quan trọng</p>
                <p>Điền đúng <strong>nội dung chuyển khoản</strong>: <span className="font-black" style={{ color: GOLD }}>{payment.transferContent}</span></p>
                <p>Sau khi chuyển khoản, admin sẽ xác nhận trong vòng <strong>24 giờ</strong> (thường 30 phút).</p>
                <p>Tài khoản tự động nâng cấp Premium sau khi xác nhận.</p>
              </div>
            </div>

            <Button variant="yellow" className="w-full" onClick={onClose}>
              <CheckCircle2 size={14} /> Đã hiểu, đóng
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment History Card ───────────────────────────────────────────────────
function PaymentHistory() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: paymentsApi.getMyPayments,
  });

  if (isLoading) return null;
  if (!payments?.length) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Clock size={14} style={{ color: GOLD }} />
        <h3 className="font-display font-black text-sm">Lịch sử thanh toán</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {payments.map((p: any) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Premium {p.planName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Nội dung: <span className="font-mono">{p.transferContent}</span> · {new Date(p.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1',
              p.status === 'verified'  ? 'bg-green-100 text-green-700' :
              p.status === 'rejected'  ? 'bg-red-100 text-red-600' :
                                         'bg-amber-100 text-amber-700')}>
              {p.status === 'verified'  ? <><CheckCircle2 size={9} /> Đã xác nhận</> :
               p.status === 'rejected'  ? <><XCircle size={9} /> Bị từ chối</> :
                                          <><RefreshCw size={9} /> Đang chờ</>}
            </span>
            <p className="text-sm font-black" style={{ color: GOLD }}>{formatVND(p.amountVnd)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main PremiumPage ───────────────────────────────────────────────────────
export default function PremiumPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [selectedPlan, setSelectedPlan] = React.useState<typeof PLANS[0] | null>(null);

  const isPremium = user?.plan === 'premium';
  const isIOS = Capacitor.getPlatform() === 'ios';

  return (
    <MainLayout>
      <div className="min-h-screen" style={{ background: `linear-gradient(175deg, #FFFBF0 0%, ${LUX.goldPale}35 40%, ${LUX.cream}55 100%)` }}>

        {/* Sticky header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-100 px-8 h-14 flex items-center justify-between sticky top-14 z-20">
          <div className="flex items-center gap-2">
            <Crown size={16} style={{ color: GOLD }} />
            <h1 className="font-display font-black text-lg">Premium</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ChevronRight size={13} className="rotate-180" /> Dashboard
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-black"
                 style={{ background: 'rgba(228,168,8,0.14)', border: '1px solid rgba(253,213,47,0.4)', color: LUX.charcoal }}>
              <Star size={13} fill={GOLD} /> FLY ACADEMY PREMIUM
            </div>
            <h2 className="font-display font-black text-4xl text-gray-900 mb-3 leading-tight">
              Chinh phục PTE Academic<br />
              <span style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_B}, ${GOLD})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                không giới hạn
              </span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              AI chấm điểm chuyên sâu, đề thi thật, mock test không giới hạn — mọi thứ bạn cần để đạt 79+.
            </p>

            {isPremium && (
              <div className="inline-flex items-center gap-2 mt-4 rounded-xl px-4 py-2 text-sm font-bold"
                   style={{ background: 'rgba(228,168,8,0.12)', color: LUX.charcoal }}>
                <CheckCircle2 size={15} /> Bạn đang sử dụng Premium
              </div>
            )}
          </div>

          {/* Features strip */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                <CheckCircle2 size={14} style={{ color: GOLD, flexShrink: 0 }} />
                <span className="text-sm text-gray-700 font-semibold">{f}</span>
              </div>
            ))}
          </div>

          {isIOS ? (
            <div className="card p-6 mb-8 text-center">
              <h3 className="font-display font-black text-base mb-3 flex items-center justify-center gap-2">
                <Lock size={15} style={{ color: GOLD }} /> Premium trên iOS
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Tài khoản Premium đã được đồng bộ theo trạng thái tài khoản của bạn.
                Vui lòng đăng nhập bằng tài khoản đã kích hoạt Premium để sử dụng đầy đủ tính năng.
              </p>
            </div>
          ) : (
            <>
              {/* Pricing cards */}
              <div className="grid grid-cols-3 gap-5 mb-10">
                {PLANS.map((plan) => (
                  <div key={plan.index}
                       className={clsx('relative rounded-2xl overflow-hidden transition-all duration-200',
                         plan.highlight
                           ? 'shadow-xl'
                           : 'shadow-card border border-gray-100 bg-white'
                       )}
                       style={plan.highlight ? {
                         background: `linear-gradient(180deg, ${LUX.charcoalDeep} 0%, ${LUX.charcoal} 100%)`,
                         border: `2px solid ${GOLD_B}`,
                       } : {}}>

                    {/* Top accent line */}
                    {plan.highlight && (
                      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_B})` }} />
                    )}

                    <div className="p-6">
                      {/* Badge */}
                      <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full', plan.badgeColor)}>
                        {plan.badge}
                      </span>

                      {/* Duration */}
                      <div className="mt-4 mb-1">
                        <p className={clsx('font-display font-black text-3xl', plan.highlight ? 'text-white' : 'text-gray-900')}>
                          {plan.days}
                          <span className={clsx('text-base font-semibold ml-1', plan.highlight ? 'text-gray-400' : 'text-gray-500')}>ngày</span>
                        </p>
                      </div>

                      {/* Price */}
                      <div className="mb-2">
                        <p className="font-display font-black text-2xl" style={{ color: plan.highlight ? LUX.goldPale : GOLD }}>
                          ${plan.usd}
                          <span className={clsx('text-sm font-normal ml-1', plan.highlight ? 'text-stone-300/90' : 'text-gray-400')}>USD</span>
                        </p>
                        <p className={clsx('text-xs mt-0.5', plan.highlight ? 'text-gray-500' : 'text-gray-400')}>
                          {formatVND(plan.vnd)}
                        </p>
                      </div>

                      <p className={clsx('text-sm mb-5', plan.highlight ? 'text-gray-400' : 'text-gray-500')}>
                        {plan.description}
                      </p>

                      {/* Per-day cost */}
                      <div className={clsx('rounded-xl px-3 py-2 mb-5 text-center',
                        plan.highlight
                          ? 'bg-white/[0.06] border border-white/10'
                          : 'bg-gray-50 border border-gray-100')}>
                        <p className={clsx('text-xs font-bold', plan.highlight ? 'text-stone-200/95' : 'text-gray-500')}>
                          Chỉ <span style={{ color: plan.highlight ? LUX.cream : GOLD }}>{formatVND(Math.round(plan.vnd / plan.days))}</span>/ngày
                        </p>
                      </div>

                      <button
                        onClick={() => !isPremium && setSelectedPlan(plan)}
                        disabled={isPremium}
                        className={clsx('w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2',
                          isPremium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                          plan.highlight
                            ? 'text-white hover:brightness-110'
                            : 'border border-gray-200 hover:border-brand-gold hover:text-brand-gold transition-colors'
                        )}
                        style={
                          plan.highlight
                            ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})`, color: '#FFFFFF' }
                            : {}
                        }>
                        {isPremium ? <><CheckCircle2 size={14} /> Đang dùng</> : <><Plane size={14} /> Mua ngay</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment guide */}
              <div className="card p-6 mb-8">
                <h3 className="font-display font-black text-base mb-4 flex items-center gap-2">
                  <Shield size={15} style={{ color: GOLD }} /> Hướng dẫn thanh toán
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { step: '01', title: 'Chọn gói',       desc: 'Chọn gói Premium phù hợp và nhấn Mua ngay'     },
                    { step: '02', title: 'Quét mã QR',     desc: 'Dùng app ngân hàng quét mã VietQR TPBank'       },
                    { step: '03', title: 'Nhập nội dung',  desc: 'Điền đúng mã nội dung theo tên tài khoản bạn'  },
                    { step: '04', title: 'Chờ xác nhận',   desc: 'Admin xác nhận trong 24h, thường 30 phút'       },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-display font-black text-sm text-white"
                           style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_B})` }}>
                        {step}
                      </div>
                      <p className="font-bold text-sm text-gray-900 mb-1">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment history */}
              <PaymentHistory />
            </>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {!isIOS && selectedPlan && <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </MainLayout>
  );
}
