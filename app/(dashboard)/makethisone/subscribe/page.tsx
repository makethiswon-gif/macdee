"use client";

import { useState } from "react";
import { Check, X, CreditCard, Sparkles, CheckCircle2, FileText, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { toast } from "sonner";

// 요금제 데이터
const PRICING_PLANS = [
    {
        id: "basic",
        name: "베이직",
        desc: "월 12회 관리",
        price: 1200000,
        features: [
            "월 12회 블로그 원고 기획 및 작성",
            "AI 맥디 무제한 이용가능",
            "기본 키워드 분석 및 매칭",
            "월간 성과 리포트 제공",
            "전담 매니저 배정"
        ],
        popular: false,
    },
    {
        id: "standard",
        name: "스탠다드",
        desc: "월 20회 관리",
        price: 2000000,
        features: [
            "월 20회 블로그 원고 기획 및 작성",
            "AI 맥디 무제한 이용가능",
            "심화 키워드 확장 및 경쟁사 분석",
            "블로그 스킨 및 프로필 디자인 1회",
            "월간 성과 리포트 및 화상 미팅",
            "전담 디렉터 배정"
        ],
        popular: true,
    },
    {
        id: "premium",
        name: "프리미엄",
        desc: "월 30회 관리",
        price: 3000000,
        features: [
            "월 30회 블로그 원고 기획 및 작성",
            "인스타그램 릴스/피드 맞춤 기획",
            "프리미엄 로컬 SEO 및 노출 최적화",
            "브랜드 블로그 전면 리뉴얼 (연 1회)",
            "주간 성과 점검 및 밀착 컨설팅",
            "수석 디렉터 배정 및 우선 대응"
        ],
        popular: false,
    }
];

export default function MakeThisOnePage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Contract, 2: Payment, 3: Complete
    const [agreed, setAgreed] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [tossPaymentsSDK, setTossPaymentsSDK] = useState<any>(null);

    // Preload Toss Payments SDK to prevent popup blockers
    useState(() => {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (clientKey) {
            loadTossPayments(clientKey).then(sdk => setTossPaymentsSDK(sdk)).catch(console.error);
        }
    });

    const handleSubscribe = (planId: string) => {
        setSelectedPlan(planId);
        setIsModalOpen(true);
        setStep(1);
        setAgreed(false);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setStep(1);
            setAgreed(false);
            setCardNumber("");
            setExpiry("");
            setCvc("");
        }, 300);
    };

    const handleSubscribeWithToss = async () => {
        if (!agreed) return;
        setIsProcessing(true);
        try {
            if (!tossPaymentsSDK) {
                toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                setIsProcessing(false);
                return;
            }

            const customerKey = `mto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            tossPaymentsSDK.requestBillingAuth("카드", {
                customerKey,
                successUrl: `${window.location.origin}/makethisone/subscribe/success?plan=${selectedPlan}&customerKey=${customerKey}`,
                failUrl: `${window.location.origin}/makethisone/subscribe/fail`,
            }).catch((err: any) => {
                console.error("Payment init error:", err);
                const errStr = typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
                toast.error(`오류 상세: ${errStr}`);
                setIsProcessing(false);
            });
        } catch (err: any) {
            console.error("Payment init error:", err);
            const errStr = typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
            toast.error(`오류 상세: ${errStr}`);
            setIsProcessing(false);
        }
    };

    const plan = PRICING_PLANS.find(p => p.id === selectedPlan);

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A1E29] to-[#0A0B10] border border-white/[0.06] mb-12">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3563AE]/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10 px-8 py-16 md:px-12 md:py-20 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3563AE]/10 border border-[#3563AE]/20 text-[#6B94E0] text-xs font-bold uppercase tracking-widest mb-6">
                            <Sparkles size={14} /> Partner Agency
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                            변호사 전문 마케팅, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6B94E0] to-[#A3C0FF]">메이크디스원</span>과 함께.
                        </h1>
                        <p className="text-[#9CA3B0] text-base md:text-lg leading-relaxed mb-8">
                            방송작가, 기자, 법학전문가가 만드는 유일한 변호사 광고 대행사. <br />
                            블로그부터 인스타그램까지, 전문적이고 차별화된 콘텐츠로 <br className="hidden md:block" />
                            변호사님의 브랜드 가치를 압도적으로 높여드립니다.
                        </p>
                        <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/70">
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#6B94E0]" /> 월간 리포트</div>
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#6B94E0]" /> 맞춤형 원고</div>
                            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#6B94E0]" /> 전담 디렉터</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Section */}
            <div className="mb-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">맞춤형 플랜 선택</h2>
                <p className="text-[#9CA3B0] text-sm">변호사님의 사무소 규모와 마케팅 목표에 맞는 플랜을 선택해 주세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PRICING_PLANS.map((p) => (
                    <div 
                        key={p.id} 
                        className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                            p.popular 
                            ? "bg-gradient-to-b from-[#161B26] to-[#0A0B10] border-[#3563AE]/50 shadow-2xl shadow-[#3563AE]/10 md:-translate-y-4" 
                            : "bg-[#11131A] border-white/[0.06] hover:border-white/20"
                        }`}
                    >
                        {p.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#3563AE] to-[#6B94E0] text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                            <p className="text-sm text-[#9CA3B0] font-medium">{p.desc}</p>
                        </div>
                        
                        <div className="mb-8 flex items-end gap-1">
                            <span className="text-3xl font-extrabold text-white">{p.price.toLocaleString()}</span>
                            <span className="text-sm font-medium text-[#9CA3B0] mb-1">원 / 월</span>
                        </div>
                        
                        <ul className="space-y-4 mb-8 flex-1">
                            {p.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-white/80">
                                    <Check size={16} className="text-[#6B94E0] mt-0.5 flex-shrink-0" />
                                    <span className="leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <button 
                            onClick={() => handleSubscribe(p.id)}
                            className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                                p.popular 
                                ? "bg-[#3563AE] text-white hover:bg-[#2A4F8A] shadow-lg shadow-[#3563AE]/20" 
                                : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                            }`}
                        >
                            구독하기
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                        onClick={step === 3 ? handleCloseModal : undefined}
                    ></div>
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-[#0F1117] border border-white/[0.08] shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0A0B10]">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                {step === 1 && <><FileText size={18} className="text-[#6B94E0]" /> 전자계약서 작성</>}
                                {step === 2 && <><CreditCard size={18} className="text-[#6B94E0]" /> 구독 결제 등록</>}
                                {step === 3 && <><CheckCircle2 size={18} className="text-green-400" /> 계약 완료</>}
                            </h2>
                            {step !== 3 && (
                                <button onClick={handleCloseModal} className="p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.05] rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            
                            {/* Step 1: Contract */}
                            <div className="space-y-6">
                                <div className="bg-[#161B26] border border-white/[0.06] rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-1">메이크디스원 마케팅 대행 계약서</h3>
                                    <p className="text-sm text-[#9CA3B0] mb-6">선택하신 <strong className="text-[#6B94E0]">{plan?.name}</strong> 플랜에 대한 서비스 이용 약관입니다.</p>
                                    
                                    <div className="bg-[#0A0B10] border border-white/[0.04] rounded-xl p-5 h-48 overflow-y-auto text-xs text-[#9CA3B0] leading-relaxed space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                                        <p>제 1 조 (목적)<br/>본 계약은 "갑(이용자)"이 "을(메이크디스원)"에게 마케팅 및 콘텐츠 제작 대행 업무를 위탁함에 있어 양 당사자의 권리와 의무를 명확히 하는 데 목적이 있습니다.</p>
                                        <p>제 2 조 (계약 기간 및 해지)<br/>1. 본 계약은 결제일로부터 1개월 단위로 자동 갱신되며, 해지 시 결제일 기준 7일 전 통보해야 합니다.<br/>2. 중도 해지 시 실제 서비스 진행 일수에 비례하여 차감된 금액이 환불됩니다.</p>
                                        <p>제 3 조 (서비스 내용)<br/>선택한 플랜({plan?.name})에 명시된 횟수({plan?.desc})만큼의 콘텐츠 기획 및 제작을 이행합니다.</p>
                                        <p>제 4 조 (비밀유지)<br/>"을"은 본 계약과 관련하여 취득한 "갑"의 모든 업무상 비밀 및 개인정보를 제3자에게 누설해서는 안 됩니다.</p>
                                    </div>
                                </div>

                                <div 
                                    className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                                    onClick={() => setAgreed(!agreed)}
                                >
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded border ${agreed ? 'bg-[#3563AE] border-[#3563AE]' : 'border-white/20 bg-transparent'}`}>
                                        {agreed && <Check size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">위 계약 내용을 모두 확인하였으며, 이에 동의합니다.</p>
                                        <p className="text-xs text-[#9CA3B0] mt-1">본 동의는 전자서명법에 따른 전자서명으로서의 효력을 가집니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-white/[0.06] bg-[#0A0B10] flex justify-end gap-3">
                            <button 
                                onClick={handleCloseModal}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSubscribeWithToss}
                                disabled={!agreed || isProcessing}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#3563AE] text-white hover:bg-[#2A4F8A] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <><Loader2 size={16} className="animate-spin" /> 연동 중...</>
                                ) : (
                                    <>
                                        결제 진행하기 <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                        
                    </div>
                </div>
            )}

        </div>
    );
}
