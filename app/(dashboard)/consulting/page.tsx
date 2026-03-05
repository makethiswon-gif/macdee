"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    TrendingUp,
    Loader2,
    Building2,
    DollarSign,
    Target,
    MapPin,
    MessageSquare,
    Sparkles,
    RotateCcw,
} from "lucide-react";

const FIRM_SIZES = [
    { key: "solo", label: "1인 사무실", icon: "👤" },
    { key: "small", label: "소규모 (2~5명)", icon: "👥" },
    { key: "medium", label: "중규모 (6~20명)", icon: "🏢" },
    { key: "large", label: "대규모 (20명+)", icon: "🏛️" },
];

const BUDGETS = [
    { key: "under50", label: "50만원 미만", value: "월 50만원 미만" },
    { key: "50to100", label: "50~100만원", value: "월 50~100만원" },
    { key: "100to300", label: "100~300만원", value: "월 100~300만원" },
    { key: "300to500", label: "300~500만원", value: "월 300~500만원" },
    { key: "over500", label: "500만원 이상", value: "월 500만원 이상" },
];

const SPECIALTIES = [
    "이혼/가사", "상속/증여", "부동산", "형사", "교통사고",
    "의료", "노동/산재", "회사/기업법무", "지식재산권", "행정",
    "파산/회생", "성범죄", "손해배상", "민사소송", "기타",
];

// Simple markdown renderer
function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactElement[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("## ")) {
            elements.push(
                <h2 key={i} className="text-lg font-bold text-[#1F2937] mt-8 mb-3 pb-2 border-b border-[#E8EBF0]">
                    {line.replace(/^## /, "")}
                </h2>
            );
        } else if (line.startsWith("### ")) {
            elements.push(
                <h3 key={i} className="text-base font-semibold text-[#374151] mt-5 mb-2">
                    {line.replace(/^### /, "")}
                </h3>
            );
        } else if (line.startsWith("□ ") || line.startsWith("- □")) {
            elements.push(
                <div key={i} className="flex items-start gap-2 py-1.5 pl-2">
                    <input type="checkbox" className="mt-1 accent-[#3563AE]" />
                    <span className="text-sm text-[#374151]">{line.replace(/^[-\s]*□\s*/, "")}</span>
                </div>
            );
        } else if (line.startsWith("- ")) {
            elements.push(
                <div key={i} className="flex items-start gap-2 py-0.5 pl-4">
                    <span className="text-[#3563AE] mt-1.5 text-[8px]">●</span>
                    <span className="text-sm text-[#374151] leading-relaxed" dangerouslySetInnerHTML={{
                        __html: line.replace(/^- /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    }} />
                </div>
            );
        } else if (line.trim() === "") {
            elements.push(<div key={i} className="h-2" />);
        } else {
            elements.push(
                <p key={i} className="text-sm text-[#374151] leading-relaxed" dangerouslySetInnerHTML={{
                    __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                }} />
            );
        }
    }
    return elements;
}

export default function ConsultingPage() {
    const [firmSize, setFirmSize] = useState("");
    const [budget, setBudget] = useState("");
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [region, setRegion] = useState("");
    const [currentStatus, setCurrentStatus] = useState("");
    const [goals, setGoals] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const canSubmit = firmSize && budget && selectedSpecialties.length > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setResult("");

        try {
            const res = await fetch("/api/consulting", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firmSize,
                    budget: BUDGETS.find(b => b.key === budget)?.value || budget,
                    specialties: selectedSpecialties,
                    region,
                    currentStatus,
                    goals,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.analysis);
            } else {
                setResult("분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            }
        } catch {
            setResult("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult("");
        setFirmSize("");
        setBudget("");
        setSelectedSpecialties([]);
        setRegion("");
        setCurrentStatus("");
        setGoals("");
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3563AE] to-[#8AB4F8] flex items-center justify-center">
                    <TrendingUp size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">AI 마케팅 컨설팅</h1>
                    <p className="text-sm text-[#6B7280]">로펌 상황에 맞는 맞춤형 마케팅 전략을 AI가 분석합니다</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!result ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-8 space-y-6"
                    >
                        {/* Firm Size */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">로펌 규모 *</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {FIRM_SIZES.map((size) => (
                                    <button
                                        key={size.key}
                                        onClick={() => setFirmSize(size.key)}
                                        className={`p-4 rounded-xl border text-center transition-all ${firmSize === size.key
                                            ? "border-[#3563AE] bg-[#3563AE]/[0.06] shadow-sm"
                                            : "border-[#E4E7ED] hover:border-[#3563AE]/30"
                                            }`}
                                    >
                                        <span className="text-2xl">{size.icon}</span>
                                        <p className={`text-xs font-medium mt-2 ${firmSize === size.key ? "text-[#3563AE]" : "text-[#374151]"}`}>
                                            {size.label}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Budget */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">월 마케팅 예산 *</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {BUDGETS.map((b) => (
                                    <button
                                        key={b.key}
                                        onClick={() => setBudget(b.key)}
                                        className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${budget === b.key
                                            ? "border-[#3563AE] bg-[#3563AE]/[0.06] text-[#3563AE]"
                                            : "border-[#E4E7ED] text-[#374151] hover:border-[#3563AE]/30"
                                            }`}
                                    >
                                        {b.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Specialties */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">전문 분야 * <span className="text-[#9CA3B0] font-normal">(복수 선택 가능)</span></h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {SPECIALTIES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => toggleSpecialty(s)}
                                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selectedSpecialties.includes(s)
                                            ? "border-[#3563AE] bg-[#3563AE] text-white"
                                            : "border-[#E4E7ED] text-[#374151] hover:border-[#3563AE]/30"
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Region */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">지역 <span className="text-[#9CA3B0] font-normal">(선택)</span></h2>
                            </div>
                            <input
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                placeholder="예: 서울 강남, 부산, 대전 등"
                                className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] text-sm text-[#374151] placeholder:text-[#C4C9D4] focus:border-[#3563AE] focus:ring-1 focus:ring-[#3563AE]/20 outline-none transition-all"
                            />
                        </div>

                        {/* Current Status */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">현재 마케팅 상황 <span className="text-[#9CA3B0] font-normal">(선택)</span></h2>
                            </div>
                            <textarea
                                value={currentStatus}
                                onChange={(e) => setCurrentStatus(e.target.value)}
                                placeholder="현재 진행 중인 마케팅 활동, 블로그 운영 여부, 광고 집행 경험, 고민되는 점 등을 자유롭게 적어주세요."
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] text-sm text-[#374151] placeholder:text-[#C4C9D4] focus:border-[#3563AE] focus:ring-1 focus:ring-[#3563AE]/20 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Goals */}
                        <div className="p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={16} className="text-[#3563AE]" />
                                <h2 className="text-sm font-semibold text-[#1F2937]">목표 <span className="text-[#9CA3B0] font-normal">(선택)</span></h2>
                            </div>
                            <textarea
                                value={goals}
                                onChange={(e) => setGoals(e.target.value)}
                                placeholder="예: 월 상담 문의 30건 달성, 네이버 블로그 상위 노출, 특정 분야 전문 브랜딩 등"
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] text-sm text-[#374151] placeholder:text-[#C4C9D4] focus:border-[#3563AE] focus:ring-1 focus:ring-[#3563AE]/20 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || loading}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3563AE] to-[#5B8DEF] text-white font-semibold text-sm shadow-lg shadow-[#3563AE]/20 hover:shadow-xl hover:shadow-[#3563AE]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    AI가 맞춤 전략을 분석 중입니다...
                                </>
                            ) : (
                                <>
                                    <TrendingUp size={16} />
                                    AI 마케팅 전략 분석 시작
                                </>
                            )}
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8"
                    >
                        {/* Result header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3563AE] to-[#8AB4F8] flex items-center justify-center">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-[#1F2937]">AI 맞춤 마케팅 전략</h2>
                                    <p className="text-[10px] text-[#9CA3B0]">Claude Sonnet 4 분석 결과</p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] bg-[#F3F4F6] rounded-lg hover:bg-[#E5E7EB] transition-colors"
                            >
                                <RotateCcw size={12} />
                                다시 분석
                            </button>
                        </div>

                        {/* Summary chips */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="px-3 py-1 rounded-full bg-[#3563AE]/10 text-[#3563AE] text-[11px] font-medium">
                                {FIRM_SIZES.find(f => f.key === firmSize)?.label}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-[11px] font-medium">
                                {BUDGETS.find(b => b.key === budget)?.label}
                            </span>
                            {selectedSpecialties.map(s => (
                                <span key={s} className="px-3 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-medium">
                                    {s}
                                </span>
                            ))}
                            {region && (
                                <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-[11px] font-medium">
                                    📍 {region}
                                </span>
                            )}
                        </div>

                        {/* Analysis content */}
                        <div className="p-8 rounded-2xl bg-white border border-[#E8EBF0] shadow-sm">
                            <div className="prose-sm max-w-none">
                                {renderMarkdown(result)}
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-[#3563AE]/[0.05] to-[#8AB4F8]/[0.05] border border-[#3563AE]/10">
                            <p className="text-sm text-[#374151]">
                                💡 <strong>지금 바로 시작하세요.</strong> 콘텐츠 페이지에서 자료를 업로드하면 AI가 4개 채널 콘텐츠를 자동 생성합니다.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
