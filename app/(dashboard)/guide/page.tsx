"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    Mic,
    StickyNote,
    Link as LinkIcon,
    HelpCircle,
    Wand2,
    CheckCircle2,
    Send,
    BarChart3,
    User,
    Settings,
    ChevronRight,
    Sparkles,
    ArrowRight,
    BookOpen,
    Instagram,
    Globe,
    Search,
    Palette,
    Phone,
    Eye,
} from "lucide-react";

/* ─── Step Data ─── */
const STEPS = [
    {
        id: "upload",
        num: "01",
        title: "자료 업로드",
        subtitle: "하루 10분, 어떤 형태든 올리세요",
        icon: Upload,
        color: "#3563AE",
        description: "판결문, 상담 녹취, 메모, 블로그 URL, FAQ 등 어떤 형태의 자료든 업로드하면 AI가 자동으로 마케팅 콘텐츠를 생성합니다.",
        details: [
            { icon: FileText, label: "판결문 PDF", desc: "판결문을 올리면 AI가 개인정보를 비식별화하고 핵심 이슈를 추출합니다." },
            { icon: Mic, label: "상담 녹취", desc: "MP3, WAV 등 오디오 파일을 올리면 AI가 텍스트로 변환 후 콘텐츠를 생성합니다." },
            { icon: StickyNote, label: "메모", desc: "사건 메모나 상담 내용을 텍스트로 직접 입력하세요." },
            { icon: LinkIcon, label: "블로그 URL", desc: "네이버 블로그나 뉴스 URL을 입력하면 본문을 자동 추출합니다." },
            { icon: HelpCircle, label: "FAQ", desc: "자주 받는 질문과 답변을 입력하면 Q&A 형태의 콘텐츠를 만듭니다." },
        ],
        tip: "💡 어떤 형태든 괜찮습니다. 완벽하지 않아도 됩니다. AI가 알아서 정리합니다.",
    },
    {
        id: "content",
        num: "02",
        title: "AI 콘텐츠 확인",
        subtitle: "4개 채널에 맞춘 콘텐츠가 자동 생성됩니다",
        icon: Wand2,
        color: "#8B5CF6",
        description: "업로드한 자료를 기반으로 AI가 네이버 블로그, 인스타그램, 구글 SEO, AI 검색 최적화까지 4개 채널에 최적화된 콘텐츠를 동시에 생성합니다.",
        details: [
            { icon: BookOpen, label: "네이버 블로그", desc: "C-Rank 최적화된 전문 칼럼을 자동 작성합니다." },
            { icon: Instagram, label: "인스타그램", desc: "5장 카드뉴스 형태의 콘텐츠를 자동 생성합니다." },
            { icon: Globe, label: "구글 SEO", desc: "Schema Markup + 메타태그 최적화 콘텐츠를 만듭니다." },
            { icon: Search, label: "AI 검색 최적화", desc: "ChatGPT, Perplexity 등이 인용하는 프로필을 구축합니다." },
        ],
        tip: "💡 콘텐츠 메뉴에서 생성된 글을 확인하고, 제목과 본문을 자유롭게 수정할 수 있습니다.",
    },
    {
        id: "review",
        num: "03",
        title: "검수 및 승인",
        subtitle: "SEO 점수를 확인하고 승인하세요",
        icon: CheckCircle2,
        color: "#10B981",
        description: "AI가 생성한 콘텐츠를 검토하고, 필요하면 수정한 뒤 승인 버튼을 누르세요. 블로그/구글 채널에는 실시간 SEO 적합도 점수가 표시됩니다.",
        details: [
            { icon: Eye, label: "콘텐츠 미리보기", desc: "실제 발행될 모습을 미리 확인할 수 있습니다." },
            { icon: FileText, label: "직접 수정", desc: "제목, 본문을 자유롭게 수정하고 저장할 수 있습니다." },
            { icon: Sparkles, label: "SEO 적합도", desc: "제목 길이, 본문 분량, 키워드 등을 실시간으로 체크합니다." },
        ],
        tip: "💡 SEO 점수 80점 이상이면 검색 노출에 매우 유리합니다.",
    },
    {
        id: "publish",
        num: "04",
        title: "발행",
        subtitle: "승인하면 자동으로 발행됩니다",
        icon: Send,
        color: "#F59E0B",
        description: "구글 SEO와 AI 검색 채널은 승인 즉시 자동 발행됩니다. 네이버 블로그는 본문을 복사하여 직접 발행하고, 인스타그램은 카드뉴스를 다운로드하여 업로드합니다.",
        details: [
            { icon: Globe, label: "구글 · AI 검색", desc: "승인 시 자동 발행 → 블로그 페이지에 즉시 공개됩니다." },
            { icon: BookOpen, label: "네이버 블로그", desc: "본문 복사 버튼으로 복사 → 네이버 블로그에 붙여넣기합니다." },
            { icon: Instagram, label: "인스타그램", desc: "카드뉴스 이미지를 다운로드하여 인스타그램에 업로드합니다." },
        ],
        tip: "💡 발행 메뉴에서 모든 채널의 발행 현황을 한눈에 볼 수 있습니다.",
    },
    {
        id: "analytics",
        num: "05",
        title: "성과 분석",
        subtitle: "마케팅 성과를 한눈에 확인하세요",
        icon: BarChart3,
        color: "#EC4899",
        description: "분석 메뉴에서 조회수, 클릭수, 문의수 등 마케팅 성과를 기간별로 확인할 수 있습니다. 채널별 성과 비교도 가능합니다.",
        details: [
            { icon: Eye, label: "조회수 추적", desc: "블로그 페이지의 방문자 수를 자동으로 추적합니다." },
            { icon: BarChart3, label: "기간별 분석", desc: "7일~90일 기간을 설정하여 성과 추이를 확인합니다." },
        ],
        tip: "💡 대시보드에서도 핵심 지표를 간략하게 확인할 수 있습니다.",
    },
    {
        id: "profile",
        num: "06",
        title: "프로필 설정",
        subtitle: "나만의 전문 블로그가 자동으로 만들어집니다",
        icon: User,
        color: "#6366F1",
        description: "프로필 메뉴에서 이름, 전문분야, 사무소 정보, 프로필 사진 등을 설정하세요. 이 정보를 기반으로 자동으로 전문 블로그 페이지가 생성됩니다.",
        details: [
            { icon: User, label: "기본 정보", desc: "이름, 전문분야, 활동지역, 경력을 입력합니다." },
            { icon: Palette, label: "브랜드 컬러", desc: "블로그에 적용될 브랜드 컬러를 선택합니다." },
            { icon: Phone, label: "연락처", desc: "전화번호, 웹사이트를 추가하면 블로그에 연동됩니다." },
            { icon: Globe, label: "전문 블로그", desc: "blog/내-slug 주소로 나만의 블로그가 자동 생성됩니다." },
        ],
        tip: "💡 프로필을 상세하게 작성할수록 AI가 더 맞춤화된 콘텐츠를 생성합니다.",
    },
];

export default function GuidePage() {
    const [activeStep, setActiveStep] = useState(0);
    const current = STEPS[activeStep];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3563AE]/20 to-[#6B94E0]/10 flex items-center justify-center">
                        <BookOpen size={18} className="text-[#3563AE]" />
                    </div>
                    <div>
                        <h1 className="text-[22px] sm:text-[26px] font-bold text-white/90 tracking-tight">
                            macdee 사용 가이드
                        </h1>
                    </div>
                </div>
                <p className="text-[13px] text-white/30 mt-2 ml-12">
                    처음이신가요? 아래 6단계를 따라하면 마케팅이 시작됩니다.
                </p>
            </motion.div>

            {/* Flow Overview — horizontal step bar */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex gap-1 overflow-x-auto pb-2"
            >
                {STEPS.map((step, i) => (
                    <button
                        key={step.id}
                        onClick={() => setActiveStep(i)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 ${i === activeStep
                                ? "text-white shadow-lg"
                                : "text-white/30 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white/50"
                            }`}
                        style={
                            i === activeStep
                                ? { background: `linear-gradient(135deg, ${step.color}40, ${step.color}20)`, borderColor: `${step.color}30` }
                                : undefined
                        }
                    >
                        <span className="text-[10px] opacity-60">{step.num}</span>
                        <step.icon size={14} />
                        {step.title}
                    </button>
                ))}
            </motion.div>

            {/* Active Step Detail */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6"
                >
                    {/* Main card */}
                    <div
                        className="rounded-2xl border border-white/[0.08] overflow-hidden"
                        style={{ background: `linear-gradient(180deg, ${current.color}08 0%, transparent 40%)` }}
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: `${current.color}20` }}
                                >
                                    <current.icon size={20} style={{ color: current.color }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: `${current.color}99` }}>
                                        STEP {current.num}
                                    </p>
                                    <h2 className="text-[20px] sm:text-[22px] font-bold text-white/90 tracking-tight">
                                        {current.title}
                                    </h2>
                                </div>
                            </div>
                            <p className="text-[15px] text-white/60 font-medium mb-2">
                                {current.subtitle}
                            </p>
                            <p className="text-[13px] text-white/35 leading-relaxed max-w-2xl">
                                {current.description}
                            </p>
                        </div>

                        {/* Details grid */}
                        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                            <div className={`grid gap-3 ${current.details.length > 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                                {current.details.map((d, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + i * 0.05 }}
                                        className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: `${current.color}15` }}
                                        >
                                            <d.icon size={14} style={{ color: current.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-white/70">{d.label}</p>
                                            <p className="text-[11px] text-white/30 mt-1 leading-relaxed">{d.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Tip */}
                        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                            <div
                                className="px-4 py-3 rounded-xl border"
                                style={{
                                    background: `${current.color}08`,
                                    borderColor: `${current.color}15`,
                                }}
                            >
                                <p className="text-[12px] text-white/50 leading-relaxed">{current.tip}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                            disabled={activeStep === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-medium text-white/30 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} className="rotate-180" />
                            이전
                        </button>

                        {/* Dots */}
                        <div className="flex gap-1.5">
                            {STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveStep(i)}
                                    className={`rounded-full transition-all duration-300 ${i === activeStep
                                            ? "w-5 h-1.5"
                                            : "w-1.5 h-1.5 hover:bg-white/20"
                                        }`}
                                    style={
                                        i === activeStep
                                            ? { background: current.color }
                                            : { background: "rgba(255,255,255,0.08)" }
                                    }
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
                            disabled={activeStep === STEPS.length - 1}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-medium text-white/30 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            다음
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Quick summary flow */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
                <h3 className="text-[13px] font-semibold text-white/40 mb-5">전체 플로우 요약</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {STEPS.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveStep(i)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
                            >
                                <div
                                    className="w-6 h-6 rounded-md flex items-center justify-center"
                                    style={{ background: `${step.color}20` }}
                                >
                                    <step.icon size={12} style={{ color: step.color }} />
                                </div>
                                <span className="text-[11px] font-medium text-white/40 group-hover:text-white/70 transition-colors whitespace-nowrap">
                                    {step.title}
                                </span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <ArrowRight size={12} className="text-white/10 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
