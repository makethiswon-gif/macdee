"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import {
    CreditCard,
    Check,
    Loader2,
    Crown,
    AlertCircle,
    X,
} from "lucide-react";

const PLANS = [
    { key: "30", name: "월 30건", price: 49000, perUnit: "1,633", tag: null },
    { key: "50", name: "월 50건", price: 69000, perUnit: "1,380", tag: "인기" },
    { key: "100", name: "월 100건", price: 119000, perUnit: "1,190", tag: null },
    { key: "unlimited", name: "무제한", price: 179000, perUnit: null, tag: "헤비유저" },
];

interface Subscription {
    plan: string;
    status: string;
    uploads_used: number;
    uploads_limit: number | null;
    amount: number;
    card_last4?: string;
    card_company?: string;
    current_period_end?: string;
    customer_key?: string;
}

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    const fetchSubscription = useCallback(async () => {
        try {
            const res = await fetch("/api/subscription");
            const data = await res.json();
            setSubscription(data.subscription || null);
        } catch {
            console.error("Failed to fetch subscription");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const handleSubscribe = async (planKey: string) => {
        setProcessing(true);
        try {
            const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
            if (!clientKey) {
                toast.error("결제 설정이 되어있지 않습니다.");
                return;
            }

            const tossPayments = await loadTossPayments(clientKey);
            const customerKey = `macdee_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payment = (tossPayments as any).payment({ customerKey });
            await payment.requestBillingAuth({
                method: "CARD",
                successUrl: `${window.location.origin}/billing/success?plan=${planKey}&customerKey=${customerKey}`,
                failUrl: `${window.location.origin}/billing/fail`,
            });
        } catch (err) {
            console.error("Payment init error:", err);
            toast.error("결제 초기화 중 오류가 발생했습니다.");
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        try {
            const res = await fetch("/api/subscription", { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setShowCancel(false);
                await fetchSubscription();
            } else {
                toast.error(data.error || "해지 실패");
            }
        } catch {
            toast.error("해지 처리 중 오류가 발생했습니다.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#3563AE]" />
            </div>
        );
    }

    const currentPlan = subscription?.plan || "free";
    const isActive = subscription?.status === "active" && currentPlan !== "free";
    const isCancelled = subscription?.status === "cancelled";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#1F2937]">결제 관리</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                    요금제를 선택하고 구독을 관리합니다.
                </p>
            </div>

            {/* Current subscription info */}
            {isActive && (
                <div className="mb-8 p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#3563AE]/10 flex items-center justify-center">
                                <Crown size={20} className="text-[#3563AE]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#1F2937]">
                                    {PLANS.find((p) => p.key === currentPlan)?.name || currentPlan} 구독 중
                                </p>
                                <p className="text-xs text-[#9CA3B0]">
                                    {subscription?.card_company} ****{subscription?.card_last4}
                                    {subscription?.current_period_end &&
                                        ` · 다음 결제: ${new Date(subscription.current_period_end).toLocaleDateString("ko-KR")}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCancel(true)}
                            className="text-xs text-[#9CA3B0] hover:text-red-500 transition-colors"
                        >
                            구독 해지
                        </button>
                    </div>

                    {/* Usage bar */}
                    <div className="mt-4 pt-4 border-t border-[#E8EBF0]">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-[#6B7280]">이번 달 업로드</span>
                            <span className="font-medium text-[#374151]">
                                {subscription?.uploads_used || 0}
                                {subscription?.uploads_limit ? ` / ${subscription.uploads_limit}건` : " / 무제한"}
                            </span>
                        </div>
                        {subscription?.uploads_limit && (
                            <div className="h-2 bg-[#E8EBF0] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#3563AE] rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ((subscription.uploads_used || 0) / subscription.uploads_limit) * 100)}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isCancelled && (
                <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">구독이 해지 예정입니다</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            현재 결제 기간까지는 이용 가능합니다. 새 요금제를 선택하면 다시 활성화됩니다.
                        </p>
                    </div>
                </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.key && isActive;
                    const isPopular = plan.tag === "인기";

                    return (
                        <div
                            key={plan.key}
                            className={`relative p-5 rounded-2xl border transition-all ${isCurrent
                                ? "bg-[#3563AE]/[0.04] border-[#3563AE]/30"
                                : isPopular
                                    ? "bg-white border-[#3563AE]/20 shadow-sm"
                                    : "bg-white border-[#E8EBF0] hover:border-[#3563AE]/20"
                                }`}
                        >
                            {plan.tag && (
                                <span
                                    className={`absolute -top-2.5 left-4 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${isPopular
                                        ? "bg-[#3563AE] text-white"
                                        : "bg-[#E8EBF0] text-[#6B7280]"
                                        }`}
                                >
                                    {plan.tag}
                                </span>
                            )}

                            <p className="text-[13px] text-[#6B7280] font-medium">{plan.name}</p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-extrabold text-[#1F2937] tabular-nums">
                                    {plan.price.toLocaleString()}
                                </span>
                                <span className="text-xs text-[#9CA3B0]">원/월</span>
                            </div>
                            {plan.perUnit && (
                                <p className="text-[11px] text-[#9CA3B0] mt-1">
                                    업로드 1건당 {plan.perUnit}원
                                </p>
                            )}
                            {!plan.perUnit && (
                                <p className="text-[11px] text-[#3563AE]/60 font-medium mt-1">무제한 생성</p>
                            )}

                            {isCurrent ? (
                                <div className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#3563AE] bg-[#3563AE]/[0.06] rounded-xl">
                                    <Check size={14} />
                                    현재 플랜
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(plan.key)}
                                    disabled={processing}
                                    className={`mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 ${isPopular
                                        ? "text-white bg-[#3563AE] hover:bg-[#2A4F8A]"
                                        : "text-[#374151] bg-[#F3F4F6] hover:bg-[#E8EBF0]"
                                        }`}
                                >
                                    {processing ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <CreditCard size={14} />
                                    )}
                                    {isActive ? "변경하기" : "시작하기"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="mt-6 text-center text-[11px] text-[#9CA3B0]">
                부가세 별도 · 언제든 해지 가능 · 테스트 카드: 4330-0000-0443-0000
            </p>

            {/* Cancel modal */}
            {showCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-[#1F2937]">구독 해지</h3>
                            <button onClick={() => setShowCancel(false)}>
                                <X size={18} className="text-[#9CA3B0]" />
                            </button>
                        </div>
                        <p className="text-sm text-[#6B7280] leading-relaxed">
                            정말 구독을 해지하시겠습니까?
                            <br />
                            현재 결제 기간이 끝날 때까지는 계속 이용 가능합니다.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowCancel(false)}
                                className="flex-1 py-2.5 text-sm font-medium text-[#374151] bg-[#F3F4F6] rounded-xl hover:bg-[#E8EBF0] transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                            >
                                해지하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
