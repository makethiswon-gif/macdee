"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FileText,
  Mic,
  Globe,
  Instagram,
  BookOpen,
  Search,
  Upload,
  Wand2,
  Rocket,
  Check,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/* ─── Animations (slow, cinematic) ─── */
const reveal = {
  hidden: { opacity: 0, y: 60 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

/* ═══════════════════ HEADER ═══════════════════ */
function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 mix-blend-difference">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between h-20">
          <a href="/" className="text-white text-lg font-bold tracking-tight">
            macdee.
          </a>

          <nav className="hidden md:flex items-center gap-10">
            {["서비스", "프로세스", "가격", "매거진"].map((t) => (
              <a
                key={t}
                href={t === "매거진" ? "/magazine" : `#${t === "서비스" ? "features" : t === "프로세스" ? "process" : "pricing"}`}
                className="text-[13px] text-white/70 hover:text-white transition-colors tracking-wide"
              >
                {t}
              </a>
            ))}
            <a
              href="/signup"
              className="text-[13px] text-white tracking-wide hover:text-white/70 transition-colors"
            >
              시작하기 →
            </a>
          </nav>

          <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:hidden pb-8 flex flex-col gap-6"
          >
            {[["서비스", "#features"], ["프로세스", "#process"], ["가격", "#pricing"], ["매거진", "/magazine"], ["시작하기", "/signup"]].map(([l, h]) => (
              <a key={l} href={h} className="text-sm text-white/70 hover:text-white" onClick={() => setOpen(false)}>
                {l}
              </a>
            ))}
          </motion.nav>
        )}
      </div>
    </header>
  );
}

/* ═══════════════════ HERO ═══════════════════ */
function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.96]);

  return (
    <section ref={ref} className="relative min-h-[100dvh] flex items-center bg-[#0A0A0A] overflow-hidden">
      {/* Subtle grain */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <motion.div style={{ opacity, scale }} className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-32">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Tag */}
          <motion.p variants={reveal} custom={0} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            AI Marketing Platform for Lawyers
          </motion.p>

          {/* Sub headline — smaller */}
          <motion.p
            variants={reveal}
            custom={1}
            className="mt-8 text-[clamp(1.1rem,2.5vw,1.6rem)] font-medium text-white/50 tracking-[-0.01em]"
          >
            변호사님의 일상과 업무가 콘텐츠로,
          </motion.p>

          {/* Mega headline — dominant */}
          <motion.h1
            variants={reveal}
            custom={2}
            className="mt-4 text-[clamp(2.2rem,6vw,5.5rem)] font-extrabold leading-[1] tracking-[-0.03em]"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#8AB4F8]">하루 10분,</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">AI 맥디로 24시간</span>
            <br />
            <span className="text-white">쉬지 않는 마케팅을 완성하세요.</span>
          </motion.h1>

          {/* AI credibility */}
          <motion.p
            variants={reveal}
            custom={3}
            className="mt-8 text-[15px] text-white/25 max-w-lg leading-relaxed"
          >
            맥디 AI는 수천 건의 성공 사례로 학습된
            <br className="sm:hidden" />
            {" "}<span className="text-[#3563AE]/70">대기업 마케팅 과장급 에디터</span>입니다.
          </motion.p>

          {/* CTA */}
          <motion.div variants={reveal} custom={4} className="mt-14 flex items-center gap-6">
            <a
              href="/signup"
              className="group inline-flex items-center gap-3 px-8 py-4 text-[15px] font-medium text-[#0A0A0A] bg-white rounded-full hover:bg-[#E8E8E8] transition-all"
            >
              무료 체험 시작
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a href="#process" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">
              작동 방식 알아보기
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </motion.div>
    </section>
  );
}

/* ═══════════════════ FEATURES ═══════════════════ */
function FeaturesSection() {
  const channels = [
    { icon: BookOpen, title: "네이버 블로그", desc: "C-Rank 최적화 전문 칼럼 자동 작성, 원클릭 발행", num: "01" },
    { icon: Instagram, title: "인스타그램", desc: "5장 카드뉴스 자동 생성 · Graph API 자동 발행", num: "02" },
    { icon: Globe, title: "AI 검색 최적화", desc: "ChatGPT·Perplexity가 인용하는 프로필 자동 구축", num: "03" },
    { icon: Search, title: "구글 SEO", desc: "Schema Markup + 메타태그 최적화 자동 발행", num: "04" },
  ];

  return (
    <section id="features" className="py-40 sm:py-52 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
          <motion.p variants={reveal} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            Service
          </motion.p>
          <motion.h2 variants={reveal} className="mt-6 text-[clamp(2rem,5vw,4rem)] font-extrabold text-[#0A0A0A] leading-[1.05] tracking-[-0.03em]">
            한 번의 업로드,
            <br />
            4개 채널을 책임집니다.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[#E8E8E8]"
        >
          {channels.map((ch, i) => (
            <motion.div
              key={i}
              variants={reveal}
              custom={i}
              className="group flex items-start gap-6 p-8 sm:p-10 border-b border-[#E8E8E8] md:odd:border-r cursor-default hover:bg-[#FAFAFA] transition-colors duration-500"
            >
              <span className="text-[11px] text-[#C0C0C0] font-mono mt-1 flex-shrink-0">{ch.num}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <ch.icon size={20} className="text-[#0A0A0A]" strokeWidth={1.5} />
                  <h3 className="text-lg font-bold text-[#0A0A0A] tracking-tight">{ch.title}</h3>
                </div>
                <p className="text-[15px] text-[#888] leading-relaxed">{ch.desc}</p>
              </div>
              <ArrowUpRight size={16} className="text-[#D0D0D0] group-hover:text-[#3563AE] transition-colors flex-shrink-0 mt-1" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ AI QUALITY ═══════════════════ */
function AIQualitySection() {
  const comparisons = [
    { label: "기존 AI", bad: true, text: "\"이혼 소송에 대해 알아보겠습니다. 이혼은 매우 중요한 결정입니다...\"" },
    { label: "맥디 AI", bad: false, text: "\"이혼을 결심하셨다면, 지금 가장 먼저 확인하셔야 할 3가지가 있습니다.\"" },
  ];

  return (
    <section className="py-40 sm:py-52 bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
          <motion.p variants={reveal} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            AI Quality
          </motion.p>
          <motion.h2 variants={reveal} className="mt-6 text-[clamp(2rem,5vw,4rem)] font-extrabold text-white leading-[1.05] tracking-[-0.03em]">
            AI가 쓴 티,
            <br />
            절대 나지 않습니다.
          </motion.h2>
          <motion.p variants={reveal} className="mt-6 text-[15px] text-white/25 max-w-lg leading-relaxed">
            &quot;~에 대해 알아보겠습니다&quot; 같은 기계적 번역투는 없습니다.
            <br />
            맥디 AI는 변호사가 직접 쓴 것처럼 전문적이고 따뜻한 글을 작성합니다.
          </motion.p>
        </motion.div>

        {/* Comparison cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {comparisons.map((c, i) => (
            <motion.div
              key={i}
              variants={reveal}
              custom={i}
              className={`relative p-8 sm:p-10 rounded-2xl border ${c.bad
                ? "border-white/[0.06] bg-white/[0.02]"
                : "border-[#3563AE]/30 bg-[#3563AE]/[0.04]"
                }`}
            >
              <div className="flex items-center gap-2 mb-5">
                <span className={`w-2 h-2 rounded-full ${c.bad ? "bg-red-400/60" : "bg-[#3563AE]"}`} />
                <span className={`text-[13px] font-semibold ${c.bad ? "text-white/40" : "text-[#3563AE]"}`}>
                  {c.label}
                </span>
                {c.bad && <span className="ml-auto text-[11px] text-red-400/50 font-medium">AI 티 심함</span>}
                {!c.bad && <span className="ml-auto text-[11px] text-[#3563AE]/60 font-medium">사람이 쓴 느낌</span>}
              </div>
              <p className={`text-[17px] leading-relaxed font-medium ${c.bad ? "text-white/20 line-through decoration-white/10" : "text-white/70"
                }`}>
                {c.text}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Key points */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="mt-16 flex flex-wrap gap-3"
        >
          {[
            "대기업 마케팅 과장급 실력",
            "네이버 C-Rank 최적화 전문",
            "변호사 특화 톤앤매너",
            "인간 에디터 수준 퀄리티",
          ].map((text, i) => (
            <motion.span
              key={i}
              variants={reveal}
              custom={i}
              className="px-5 py-2.5 rounded-full border border-white/[0.08] text-[14px] text-white/40 font-medium"
            >
              {text}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ PROCESS ═══════════════════ */
function ProcessSection() {
  const steps = [
    { icon: Upload, title: "올리세요", desc: "판결문 PDF, 녹취, 메모, 뉴스 링크 — 어떤 형태든." },
    { icon: Wand2, title: "AI가 만듭니다", desc: "비식별화 → 이슈 분석 → 4개 채널 콘텐츠 동시 생성." },
    { icon: Rocket, title: "발행됩니다", desc: "검수하고 승인하면 끝. 성과까지 자동 추적." },
  ];

  return (
    <section id="process" className="py-40 sm:py-52 bg-[#FAFAFA]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
          <motion.p variants={reveal} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            Process
          </motion.p>
          <motion.h2 variants={reveal} className="mt-6 text-[clamp(2rem,5vw,4rem)] font-extrabold text-[#0A0A0A] leading-[1.05] tracking-[-0.03em]">
            3단계로 끝.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-24 grid grid-cols-1 lg:grid-cols-3 gap-0"
        >
          {steps.map((s, i) => (
            <motion.div key={i} variants={reveal} custom={i} className="relative group">
              <div className="p-8 sm:p-10 lg:p-12">
                <span className="text-[80px] sm:text-[100px] font-black text-[#0A0A0A]/[0.03] leading-none block select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mt-[-20px]">
                  <s.icon size={24} className="text-[#3563AE] mb-5" strokeWidth={1.5} />
                  <h3 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-[15px] text-[#888] leading-relaxed">{s.desc}</p>
                </div>
              </div>
              {i < 2 && <div className="hidden lg:block absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-[#E8E8E8]" />}
              {i < 2 && <div className="lg:hidden mx-8 sm:mx-10 h-[1px] bg-[#E8E8E8]" />}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ INPUT TYPES ═══════════════════ */
function InputSection() {
  const inputs = [
    { icon: FileText, label: "판결문 PDF" },
    { icon: Mic, label: "상담 녹취" },
    { icon: FileText, label: "메모" },
    { icon: Globe, label: "뉴스 링크" },
    { icon: FileText, label: "FAQ" },
  ];

  return (
    <section className="py-40 sm:py-52 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
          <motion.p variants={reveal} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            Input
          </motion.p>
          <motion.h2 variants={reveal} className="mt-6 text-[clamp(2rem,5vw,4rem)] font-extrabold text-[#0A0A0A] leading-[1.05] tracking-[-0.03em]">
            어떤 형태든
            <br />
            올리면 됩니다.
          </motion.h2>
          <motion.p variants={reveal} className="mt-6 text-[15px] text-[#888] max-w-md leading-relaxed">
            판결문부터 간단한 메모까지. 형식에 구애받지 마세요.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-20 flex flex-wrap gap-3"
        >
          {inputs.map((inp, i) => (
            <motion.div
              key={i}
              variants={reveal}
              custom={i}
              className="flex items-center gap-3 px-6 py-4 rounded-full border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors duration-500 cursor-default"
            >
              <inp.icon size={16} className="text-[#888]" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-[#0A0A0A]">{inp.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ PRICING ═══════════════════ */
function PricingSection() {
  const plans = [
    { name: "월 30건", price: "49,000", perUnit: "1,633", discount: null, tag: null },
    { name: "월 50건", price: "69,000", perUnit: "1,380", discount: "약15%↓", tag: "인기" },
    { name: "월 100건", price: "119,000", perUnit: "1,190", discount: "약27%↓", tag: null },
    { name: "무제한", price: "179,000", perUnit: null, discount: null, tag: "헤비유저" },
  ];

  const features = [
    "모든 입력 타입 지원",
    "AI 콘텐츠 자동 생성",
    "4개 채널 동시 발행",
    "개인정보 자동 비식별화",
    "GEO 최적화 프로필",
    "구글 SEO Schema Markup",
    "성과 분석 대시보드",
  ];

  return (
    <section id="pricing" className="py-40 sm:py-52 bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-20">
          <motion.p variants={reveal} className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
            Pricing
          </motion.p>
          <motion.h2 variants={reveal} className="mt-6 text-[clamp(2rem,5vw,4rem)] font-extrabold text-white leading-[1.05] tracking-[-0.03em]">
            심플한 가격,
            <br />
            확실한 효과.
          </motion.h2>
          <motion.p variants={reveal} className="mt-6 text-[15px] text-white/30 leading-relaxed">
            7일 무료 체험. 카드 등록 없이 시작.
          </motion.p>
          <motion.div variants={reveal} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08]">
            <Upload size={14} className="text-[#3563AE]" />
            <span className="text-[13px] text-white/50">업로드 1회 = 4개 채널 콘텐츠 자동 생성 · 이것이 1건입니다</span>
          </motion.div>
        </motion.div>

        {/* Plan cards */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {plans.map((plan, i) => {
            const isPopular = plan.tag === "인기";
            return (
              <motion.div
                key={plan.name}
                variants={reveal}
                custom={i}
                className={`relative p-7 rounded-3xl border transition-all ${isPopular
                  ? "bg-white/[0.08] border-[#3563AE]/60 shadow-[0_0_40px_rgba(53,99,174,0.12)]"
                  : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]"
                  }`}
              >
                {/* Tag badge */}
                {plan.tag && (
                  <span className={`absolute -top-3 left-6 px-3 py-0.5 text-[11px] font-bold rounded-full ${isPopular
                    ? "bg-[#3563AE] text-white"
                    : "bg-white/10 text-white/60"
                    }`}>
                    {plan.tag}
                  </span>
                )}

                <p className="text-[14px] text-white/40 font-medium tracking-wide">{plan.name}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold text-white tracking-tight tabular-nums">
                    {plan.price}
                  </span>
                  <span className="text-sm text-white/25">원/월</span>
                </div>

                {/* Per-unit price */}
                <div className="mt-2 h-5">
                  {plan.perUnit ? (
                    <p className="text-[13px] text-white/30">
                      업로드 1건당 <span className="text-white/50 font-medium">{plan.perUnit}원</span>
                      {plan.discount && (
                        <span className="ml-1.5 text-[#3563AE] font-semibold">{plan.discount}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#3563AE]/60 font-medium">무제한 생성</p>
                  )}
                </div>

                <a
                  href="/signup"
                  className={`group mt-7 w-full inline-flex items-center justify-center gap-2 py-3 text-[14px] font-medium rounded-full transition-all ${isPopular
                    ? "text-[#0A0A0A] bg-white hover:bg-[#E8E8E8]"
                    : "text-white/70 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
                    }`}
                >
                  시작하기
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </a>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Common features */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}
          className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3"
        >
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check size={13} className="text-[#3563AE] flex-shrink-0" strokeWidth={2.5} />
              <span className="text-[13px] text-white/35">{f}</span>
            </div>
          ))}
        </motion.div>

        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}
          className="mt-8 text-center text-[12px] text-white/15"
        >
          부가세 별도 · 언제든 해지 가능
        </motion.p>
      </div>
    </section>
  );
}

/* ═══════════════════ CTA ═══════════════════ */
function CTASection() {
  return (
    <section className="py-40 sm:py-52 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
          <motion.h2 variants={reveal} className="text-[clamp(2rem,6vw,5rem)] font-extrabold text-[#0A0A0A] leading-[1.05] tracking-[-0.03em]">
            지금 시작하세요.
            <br />
            <span className="text-[#3563AE]">첫 7일은 무료.</span>
          </motion.h2>
          <motion.div variants={reveal} className="mt-12">
            <a
              href="/signup"
              className="group inline-flex items-center gap-3 px-10 py-4.5 text-[15px] font-medium text-[#0A0A0A] bg-white border border-[#0A0A0A] rounded-full hover:bg-[#0A0A0A] hover:text-white transition-all duration-500"
            >
              무료 체험 시작
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ FOOTER ═══════════════════ */
function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-lg font-bold text-white tracking-tight">macdee.</p>
            <p className="mt-4 text-[13px] text-white/25 leading-relaxed max-w-[240px]">
              업무에 집중하세요.<br />마케팅은 AI 맥디가 쉬지 않고.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.15em] mb-5">서비스</h4>
            <ul className="space-y-3">
              {[["주요 기능", "#features"], ["작동 방식", "#process"], ["가격", "#pricing"], ["매거진", "/magazine"]].map(([t, h]) => (
                <li key={t}><a href={h} className="text-[13px] text-white/25 hover:text-white/60 transition-colors">{t}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.15em] mb-5">지원</h4>
            <ul className="space-y-3">
              <li><a href="/terms" className="text-[13px] text-white/25 hover:text-white/60 transition-colors">이용약관</a></li>
              <li><a href="/refund" className="text-[13px] text-white/25 hover:text-white/60 transition-colors">환불정책</a></li>
              <li><a href="mailto:support@macdee.com" className="text-[13px] text-white/25 hover:text-white/60 transition-colors">문의하기</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] text-white/30 uppercase tracking-[0.15em] mb-5">연락처</h4>
            <ul className="space-y-3 text-[13px] text-white/25">
              <li>010-8935-3010</li>
              <li>support@macdee.com</li>
              <li>경기도 용인시 한일로21번길 31</li>
            </ul>
          </div>
        </div>

        {/* Business info */}
        <div className="mt-12 pt-6 border-t border-white/[0.04]">
          <p className="text-[11px] text-white/15 leading-relaxed">
            상호명: 메이크디스원 | 대표자: 김정환 | 사업자등록번호: 431-11-01233<br />
            주소: 경기도 용인시 한일로21번길 31 | 대표번호: 010-8935-3010
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/15">© 2026 macdee. All Rights Reserved.</p>
          <div className="flex gap-4">
            <a href="/terms" className="text-[11px] text-white/15 hover:text-white/40 transition-colors">이용약관</a>
            <a href="/refund" className="text-[11px] text-white/15 hover:text-white/40 transition-colors">환불정책</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════ INTRO SPLASH ═══════════════════ */
const LETTERS = ["m", "a", "c", "d", "e", "e", "."];
const SCATTER = [
  { x: -300, y: -200, rotate: -45 },
  { x: 200, y: -350, rotate: 30 },
  { x: -400, y: 100, rotate: -60 },
  { x: 350, y: 250, rotate: 55 },
  { x: -250, y: 300, rotate: -35 },
  { x: 400, y: -150, rotate: 40 },
  { x: -150, y: -400, rotate: -50 },
];

function IntroSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"gather" | "hold" | "scatter">("gather");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 800);
    const t2 = setTimeout(() => setPhase("scatter"), 2200);
    const t3 = setTimeout(onComplete, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center"
      exit={{ y: "-100%" }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] }}
    >
      {/* Subtle line */}
      <motion.div
        className="absolute top-[54%] left-1/2 -translate-x-1/2 h-[1px] bg-white/10"
        initial={{ width: 0 }}
        animate={{ width: phase === "scatter" ? 0 : 80 }}
        transition={{ duration: 0.8, delay: phase === "gather" ? 0.6 : 0, ease: "easeOut" }}
      />

      {/* Letters */}
      <div className="flex items-center gap-[2px]">
        {LETTERS.map((char, i) => (
          <motion.span
            key={i}
            className="text-3xl sm:text-4xl font-bold text-white inline-block"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={
              phase === "scatter"
                ? {
                  x: SCATTER[i].x,
                  y: SCATTER[i].y,
                  rotate: SCATTER[i].rotate,
                  opacity: 0,
                  scale: 0.5,
                  filter: "blur(12px)",
                }
                : phase === "hold"
                  ? { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
                  : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            transition={
              phase === "scatter"
                ? {
                  duration: 0.9,
                  delay: i * 0.04,
                  ease: [0.36, 0, 0.66, -0.56] as [number, number, number, number],
                }
                : {
                  duration: 0.5,
                  delay: i * 0.07,
                  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
                }
            }
          >
            {char}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════ MAIN ═══════════════════ */
export default function Home() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showIntro]);

  return (
    <main>
      <AnimatePresence mode="wait">
        {showIntro && <IntroSplash key="intro" onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Header />
        <HeroSection />
        <FeaturesSection />
        <AIQualitySection />
        <ProcessSection />
        <InputSection />
        <PricingSection />
        <CTASection />
        <Footer />
      </motion.div>
    </main>
  );
}
