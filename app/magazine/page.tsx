"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

/* ─── Types ─── */
interface Magazine {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    tags: string[];
    cover_image_url: string | null;
    view_count: number;
    published_at: string;
    author: string;
}

/* ─── Animations ─── */
const reveal = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.9, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    }),
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const lineReveal = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

/* ═══════════════ INTRO SPLASH ═══════════════ */
const TITLE_CHARS = ["i", "n", "s", "i", "g", "h", "t", "s"];
const SCATTER_POS = [
    { x: -200, y: -180, rotate: -35 },
    { x: 150, y: -250, rotate: 25 },
    { x: -300, y: 80, rotate: -50 },
    { x: 250, y: 200, rotate: 45 },
    { x: -180, y: 220, rotate: -30 },
    { x: 300, y: -120, rotate: 35 },
    { x: -120, y: -300, rotate: -40 },
    { x: 200, y: 100, rotate: 20 },
];

function IntroSplash({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState<"gather" | "hold" | "scatter">("gather");

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("hold"), 600);
        const t2 = setTimeout(() => setPhase("scatter"), 1800);
        const t3 = setTimeout(onComplete, 2800);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center gap-3"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] }}
        >
            {/* macdee. wordmark */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={phase !== "scatter" ? { opacity: 0.15, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-[13px] text-white tracking-[0.2em] uppercase font-medium"
            >
                macdee.
            </motion.p>

            {/* "insights" letters */}
            <div className="flex items-center gap-[1px]">
                {TITLE_CHARS.map((char, i) => (
                    <motion.span
                        key={i}
                        className="text-4xl sm:text-5xl font-bold text-white inline-block tracking-tight"
                        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                        animate={
                            phase === "scatter"
                                ? { x: SCATTER_POS[i].x, y: SCATTER_POS[i].y, rotate: SCATTER_POS[i].rotate, opacity: 0, scale: 0.4, filter: "blur(16px)" }
                                : phase === "hold"
                                    ? { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
                                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                        }
                        transition={
                            phase === "scatter"
                                ? { duration: 0.8, delay: i * 0.03, ease: [0.36, 0, 0.66, -0.56] as [number, number, number, number] }
                                : { duration: 0.45, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
                        }
                    >
                        {char}
                    </motion.span>
                ))}
            </div>

            {/* Subtle line */}
            <motion.div
                className="h-[1px] bg-white/10 mt-4"
                initial={{ width: 0 }}
                animate={{ width: phase === "scatter" ? 0 : 60 }}
                transition={{ duration: 0.6, delay: phase === "gather" ? 0.5 : 0, ease: "easeOut" }}
            />
        </motion.div>
    );
}

/* ═══════════════ HEADER ═══════════════ */
function Header() {
    return (
        <header className="fixed top-0 inset-x-0 z-50 mix-blend-difference">
            <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
                <div className="flex items-center justify-between h-20">
                    <Link href="/magazine" className="flex items-center gap-3">
                        <span className="text-white text-lg font-bold tracking-tight">macdee.</span>
                        <span className="text-[11px] text-white/40 tracking-[0.15em] uppercase font-medium">insights</span>
                    </Link>
                    <nav className="flex items-center gap-8">
                        <Link href="/" className="text-[13px] text-white/50 hover:text-white transition-colors">홈</Link>
                        <Link href="/signup"
                            className="text-[13px] text-white/50 hover:text-white transition-colors">시작하기</Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}

/* ═══════════════ HERO ═══════════════ */
function HeroSection() {
    return (
        <section className="relative min-h-[80dvh] flex items-end bg-[#0A0A0A] overflow-hidden pb-20">
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

            <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 w-full">
                <motion.div initial="hidden" animate="visible" variants={stagger}>
                    <motion.p variants={reveal} custom={0}
                        className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
                        macdee insights
                    </motion.p>

                    <motion.h1 variants={reveal} custom={1}
                        className="mt-8 text-[clamp(2rem,5.5vw,5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#8AB4F8]">
                            법률 마케팅의 미래를
                        </span>
                        <br />
                        <span className="text-white">먼저 읽습니다.</span>
                    </motion.h1>

                    <motion.p variants={reveal} custom={2}
                        className="mt-8 text-[15px] text-white/25 max-w-lg leading-relaxed">
                        macdee 개발팀과 법률 마케팅 전문가가 직접 쓰는
                        <br />
                        시장 분석, 트렌드 리포트, 그리고 미래 전망.
                    </motion.p>

                    {/* Decorative line */}
                    <motion.div variants={lineReveal}
                        className="mt-16 h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent origin-left max-w-lg" />
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════ ARTICLES GRID ═══════════════ */
function ArticlesSection({ magazines }: { magazines: Magazine[] }) {
    if (magazines.length === 0) {
        return (
            <section className="py-32 bg-[#0A0A0A]">
                <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                        <motion.p variants={reveal} className="text-6xl mb-6">✦</motion.p>
                        <motion.p variants={reveal} className="text-[15px] text-white/30">
                            첫 번째 인사이트가 곧 도착합니다.
                        </motion.p>
                        <motion.p variants={reveal} className="text-[13px] text-white/15 mt-2">
                            macdee 팀이 만드는 법률 마케팅의 새로운 관점을 기대하세요.
                        </motion.p>
                    </motion.div>
                </div>
            </section>
        );
    }

    const featured = magazines[0];
    const rest = magazines.slice(1);

    return (
        <section className="bg-[#0A0A0A] pb-32">
            <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
                {/* Section label */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
                    className="flex items-center gap-6 mb-16">
                    <motion.p variants={reveal} className="text-[11px] text-white/20 tracking-[0.15em] uppercase font-medium shrink-0">
                        Latest
                    </motion.p>
                    <motion.div variants={lineReveal}
                        className="flex-1 h-[1px] bg-white/[0.06] origin-left" />
                </motion.div>

                {/* Featured article */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <Link href={`/magazine/${featured.slug}`}
                        className="group grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-700 bg-white/[0.02]">
                        {/* Image */}
                        <motion.div variants={reveal} custom={0}
                            className="relative h-72 lg:h-[420px] overflow-hidden bg-gradient-to-br from-[#111] to-[#1A2744]">
                            {featured.cover_image_url ? (
                                <img src={featured.cover_image_url} alt={featured.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-7xl opacity-5 font-black">m.</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 to-transparent" />
                            <div className="absolute top-5 left-5">
                                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#3563AE] text-white">
                                    {featured.category}
                                </span>
                            </div>
                        </motion.div>

                        {/* Content */}
                        <motion.div variants={reveal} custom={1}
                            className="p-8 sm:p-12 flex flex-col justify-center">
                            <p className="text-[11px] text-white/20 tracking-[0.1em] uppercase font-medium mb-6">Featured</p>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.02em] leading-tight group-hover:text-[#8AB4F8] transition-colors duration-500">
                                {featured.title}
                            </h2>
                            <p className="mt-5 text-[15px] text-white/30 leading-relaxed line-clamp-3">
                                {featured.excerpt}
                            </p>
                            <div className="mt-8 flex items-center justify-between">
                                <span className="text-[12px] text-white/15">
                                    {featured.published_at && new Date(featured.published_at).toLocaleDateString("ko-KR", {
                                        year: "numeric", month: "long", day: "numeric",
                                    })}
                                </span>
                                <span className="flex items-center gap-1.5 text-[13px] text-[#3563AE] font-medium group-hover:gap-2.5 transition-all">
                                    읽기 <ArrowRight size={14} />
                                </span>
                            </div>
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Rest of articles */}
                {rest.length > 0 && (
                    <>
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
                            className="flex items-center gap-6 mb-12 mt-24">
                            <motion.p variants={reveal} className="text-[11px] text-white/20 tracking-[0.15em] uppercase font-medium shrink-0">
                                All posts
                            </motion.p>
                            <motion.div variants={lineReveal}
                                className="flex-1 h-[1px] bg-white/[0.06] origin-left" />
                        </motion.div>

                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                        >
                            {rest.map((article, i) => (
                                <motion.div key={article.id} variants={reveal} custom={i}>
                                    <Link href={`/magazine/${article.slug}`}
                                        className="group block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 bg-white/[0.02]">
                                        {/* Image */}
                                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#111] to-[#1A2744]">
                                            {article.cover_image_url ? (
                                                <img src={article.cover_image_url} alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-4xl opacity-5 font-black">m.</span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 backdrop-blur-sm text-white/70">
                                                    {article.category}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6">
                                            <h3 className="text-[17px] font-bold text-white tracking-tight leading-snug line-clamp-2 group-hover:text-[#8AB4F8] transition-colors duration-500">
                                                {article.title}
                                            </h3>
                                            <p className="mt-3 text-[13px] text-white/25 leading-relaxed line-clamp-2">
                                                {article.excerpt}
                                            </p>
                                            <div className="mt-5 flex items-center justify-between">
                                                <span className="text-[11px] text-white/15">
                                                    {article.published_at && new Date(article.published_at).toLocaleDateString("ko-KR", {
                                                        year: "numeric", month: "short", day: "numeric",
                                                    })}
                                                </span>
                                                <ArrowUpRight size={14} className="text-white/10 group-hover:text-[#3563AE] transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </>
                )}
            </div>
        </section>
    );
}

/* ═══════════════ CTA SECTION ═══════════════ */
function CTASection() {
    return (
        <section className="py-32 bg-white">
            <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
                    <motion.p variants={reveal}
                        className="text-[#3563AE] text-[13px] tracking-[0.2em] uppercase font-medium">
                        Try macdee
                    </motion.p>
                    <motion.h2 variants={reveal}
                        className="mt-6 text-[clamp(1.8rem,4vw,3.5rem)] font-extrabold text-[#0A0A0A] leading-[1.1] tracking-[-0.03em]">
                        인사이트를 읽었다면,
                        <br />
                        <span className="text-[#3563AE]">직접 경험해 보세요.</span>
                    </motion.h2>
                    <motion.p variants={reveal}
                        className="mt-6 text-[15px] text-[#888] max-w-md mx-auto leading-relaxed">
                        판결문 하나를 올리면, macdee가 4채널 콘텐츠를
                        <br />
                        3분 안에 완성합니다. 첫 7일은 무료.
                    </motion.p>
                    <motion.div variants={reveal} className="mt-10">
                        <Link href="/signup"
                            className="group inline-flex items-center gap-3 px-8 py-4 text-[15px] font-medium text-white bg-[#0A0A0A] rounded-full hover:bg-[#222] transition-all">
                            무료 체험 시작
                            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════ FOOTER ═══════════════ */
function Footer() {
    return (
        <footer className="bg-[#0A0A0A] border-t border-white/[0.06]">
            <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white tracking-tight">macdee.</span>
                        <span className="text-[11px] text-white/15">insights</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">홈</Link>
                        <Link href="/magazine" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">인사이트</Link>
                        <Link href="/signup" className="text-[12px] text-white/20 hover:text-white/50 transition-colors">시작하기</Link>
                    </div>
                    <p className="text-[11px] text-white/10">© 2026 macdee. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}

/* ═══════════════ MAIN ═══════════════ */
export default function MagazinePage() {
    const [showIntro, setShowIntro] = useState(true);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (showIntro) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [showIntro]);

    useEffect(() => {
        fetch("/api/magazine")
            .then(r => r.json())
            .then(data => { setMagazines(data.magazines || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <main>
            <AnimatePresence mode="wait">
                {showIntro && <IntroSplash key="intro" onComplete={() => setShowIntro(false)} />}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showIntro ? 0 : 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <Header />
                <HeroSection />
                {loading ? (
                    <div className="py-32 bg-[#0A0A0A] flex justify-center">
                        <div className="w-5 h-5 border-2 border-[#3563AE] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <ArticlesSection magazines={magazines} />
                )}
                <CTASection />
                <Footer />
            </motion.div>
        </main>
    );
}
