"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlogSplash from "@/components/BlogSplash";

interface LawyerInfo {
    name: string;
    slug: string;
    specialty: string[];
    region: string;
    bio: string;
    brand_color: string;
    office_name: string;
    experience_years: number;
    profile_image_url: string;
    phone: string | null;
    website_url: string | null;
}

interface PostData {
    id: string;
    title: string;
    slug: string;
    body: string;
    meta_description: string;
    tags: string[];
    schema_markup: Record<string, unknown> | null;
    created_at: string;
    card_news_slides?: { slide: number; text: string }[];
    card_news_cover_image?: string | null;
}

function formatInline(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/75 font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderBody(body: string, brandColor: string) {
    const lines = body.split("\n");
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("## ")) {
            elements.push(
                <h2 key={i} className="text-[22px] font-bold text-white/90 mt-14 mb-5 tracking-tight leading-snug"
                    dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^##\s+/, "")) }}
                />
            );
        } else if (line.startsWith("### ")) {
            elements.push(
                <h3 key={i} className="text-[18px] font-bold text-white/80 mt-10 mb-4 tracking-tight"
                    dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^###\s+/, "")) }}
                />
            );
        } else if (line.startsWith("# ")) {
            continue;
        } else if (line.startsWith("- ") || line.startsWith("• ")) {
            const content = formatInline(line.replace(/^[-•]\s+/, ""));
            elements.push(
                <li key={i} className="text-[15px] text-white/50 leading-[1.9] ml-5 list-none relative" style={{ ["--tw-before-bg" as string]: brandColor }}>
                    <span className="relative">
                        <span className="absolute -left-4 top-[10px] w-1 h-1 rounded-full" style={{ background: brandColor }} />
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                    </span>
                </li>
            );
        } else if (line.trim() === "") {
            elements.push(<div key={i} className="h-4" />);
        } else {
            elements.push(
                <p
                    key={i}
                    className="text-[15px] text-white/50 leading-[1.9] tracking-normal"
                    dangerouslySetInnerHTML={{ __html: formatInline(line) }}
                />
            );
        }
    }

    return elements;
}

export default function PostPageClient({ lawyer, post }: { lawyer: LawyerInfo; post: PostData }) {
    const [shared, setShared] = useState(false);
    const [cardSlide, setCardSlide] = useState(0);
    const [showPhone, setShowPhone] = useState(false);
    const hasCardNews = post.card_news_slides && post.card_news_slides.length > 0;
    const hasPhone = !!lawyer.phone;
    const hasWebsite = !!lawyer.website_url;

    const formatDate = (d: string) => {
        const date = new Date(d);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    };

    const handleShare = async () => {
        try {
            await navigator.share({ title: post.title, url: window.location.href });
        } catch {
            await navigator.clipboard.writeText(window.location.href);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    // Reading time estimate (Korean ~500 chars/min)
    const readingTime = Math.max(1, Math.ceil(post.body.length / 500));

    return (
        <div className="min-h-screen bg-[#0A0A0A]" style={{ fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
            {/* Splash entrance */}
            <BlogSplash name={lawyer.name} brandColor={lawyer.brand_color} />
            {/* Ambient gradient */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 50% 30% at 50% 0%, ${lawyer.brand_color}06 0%, transparent 70%)`,
                }}
            />

            {/* Nav */}
            <nav className="relative z-10 border-b border-white/[0.06] sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
                    <Link
                        href={`/blog/${lawyer.slug}`}
                        className="flex items-center gap-3 text-white/40 hover:text-white/70 transition-colors group"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
                            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white/80"
                                style={{ background: `${lawyer.brand_color}40` }}
                            >
                                {lawyer.name.charAt(0)}
                            </div>
                            <span className="text-[13px] font-medium">{lawyer.name}</span>
                        </div>
                    </Link>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all font-medium"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M4.5 6L7 3.5L9.5 6M7 3.5V9.5M3 8.5V10.5C3 11.0523 3.44772 11.5 4 11.5H10C10.5523 11.5 11 11.0523 11 10.5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        공유
                    </button>
                </div>
            </nav>

            {/* Article */}
            <main className="relative z-10">
                {/* Hero section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-[720px] mx-auto px-6 pt-16 sm:pt-24 pb-12"
                >
                    {/* Meta row */}
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-[11px] text-white/20 tabular-nums tracking-wide">
                            {formatDate(post.created_at)}
                        </span>
                        <span className="w-px h-3 bg-white/10" />
                        <span className="text-[11px] text-white/20">
                            {readingTime}분 읽기
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] font-extrabold text-white/95 leading-[1.25] tracking-tight">
                        {post.title}
                    </h1>

                    {/* Meta description */}
                    {post.meta_description && (
                        <div className="mt-8 relative pl-5">
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full" style={{ background: `${lawyer.brand_color}40` }} />
                            <p className="text-[14px] text-white/30 leading-relaxed">
                                {post.meta_description}
                            </p>
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags.length > 0 && (
                        <div className="mt-8 flex flex-wrap gap-2">
                            {post.tags.slice(0, 5).map((tag, i) => (
                                <span
                                    key={i}
                                    className="text-[10px] px-3 py-1.5 rounded-full border border-white/[0.06] text-white/20 font-medium"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Divider */}
                <div className="max-w-[720px] mx-auto px-6">
                    <div className="h-px bg-white/[0.06]" />
                </div>

                {/* Body */}
                <motion.article
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="max-w-[720px] mx-auto px-6 py-14 sm:py-16"
                >
                    {renderBody(post.body, lawyer.brand_color)}
                </motion.article>

                {/* Card News Section */}
                {hasCardNews && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="max-w-[720px] mx-auto px-6 py-12"
                    >
                        {/* Section header */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-px flex-1 bg-white/[0.06]" />
                            <span className="text-[11px] font-medium text-white/20 uppercase tracking-[0.15em]">카드뉴스로 보기</span>
                            <div className="h-px flex-1 bg-white/[0.06]" />
                        </div>

                        {/* Card viewer */}
                        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                            {/* Cover image background */}
                            {post.card_news_cover_image && (
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={post.card_news_cover_image}
                                        alt=""
                                        className="w-full h-full object-cover opacity-15"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
                                </div>
                            )}

                            <div className="relative z-10 p-8 sm:p-10">
                                {/* Slide counter */}
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[11px] text-white/20 tabular-nums">
                                        {cardSlide + 1} / {post.card_news_slides!.length}
                                    </span>
                                    <div className="flex gap-1">
                                        {post.card_news_slides!.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCardSlide(i)}
                                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === cardSlide
                                                    ? "w-4 bg-white/50"
                                                    : "bg-white/15 hover:bg-white/25"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Slide content */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={cardSlide}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="min-h-[200px] flex items-center"
                                    >
                                        <div className="w-full">
                                            {post.card_news_slides![cardSlide].text.split("\n").map((line, i) => (
                                                <p
                                                    key={i}
                                                    className={`${i === 0 && cardSlide === 0
                                                        ? "text-[20px] sm:text-[24px] font-bold text-white/90 leading-snug"
                                                        : line.trim() === ""
                                                            ? "h-4"
                                                            : "text-[15px] text-white/50 leading-[1.9]"
                                                        }`}
                                                >
                                                    {line.trim() || "\u00A0"}
                                                </p>
                                            ))}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Navigation */}
                                <div className="flex items-center justify-between mt-8">
                                    <button
                                        onClick={() => setCardSlide(Math.max(0, cardSlide - 1))}
                                        disabled={cardSlide === 0}
                                        className="flex items-center gap-1.5 text-[12px] text-white/25 hover:text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        이전
                                    </button>
                                    <button
                                        onClick={() => setCardSlide(Math.min(post.card_news_slides!.length - 1, cardSlide + 1))}
                                        disabled={cardSlide === post.card_news_slides!.length - 1}
                                        className="flex items-center gap-1.5 text-[12px] text-white/25 hover:text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        다음
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Divider */}
                <div className="max-w-[720px] mx-auto px-6">
                    <div className="h-px bg-white/[0.06]" />
                </div>

                {/* Author Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="max-w-[720px] mx-auto px-6 py-16"
                >
                    <div className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-start gap-5">
                            {/* Profile photo or avatar */}
                            {lawyer.profile_image_url ? (
                                <div className="relative w-16 h-16 flex-shrink-0">
                                    <div
                                        className="w-full h-full rounded-xl overflow-hidden"
                                        style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}20, transparent)` }}
                                    >
                                        <img
                                            src={lawyer.profile_image_url}
                                            alt={lawyer.name}
                                            className="w-full h-full object-cover"
                                            style={{
                                                maskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 60%, transparent 100%)",
                                                WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 60%, transparent 100%)",
                                                mixBlendMode: "luminosity",
                                            }}
                                        />
                                        <img
                                            src={lawyer.profile_image_url}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                                            style={{
                                                maskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 60%, transparent 100%)",
                                                WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 60%, transparent 100%)",
                                            }}
                                        />
                                    </div>
                                    <div
                                        className="absolute -inset-0.5 rounded-xl opacity-15 -z-10 blur-sm"
                                        style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}40, transparent)` }}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white/90 text-lg font-bold flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}60, ${lawyer.brand_color}30)` }}
                                >
                                    {lawyer.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[16px] font-bold text-white/85 tracking-tight">
                                    {lawyer.name}
                                    <span className="text-white/25 font-normal ml-1.5">변호사</span>
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-white/25">
                                    {lawyer.specialty.length > 0 && (
                                        <span>{lawyer.specialty.join(" · ")}</span>
                                    )}
                                    {lawyer.region && <span>{lawyer.region}</span>}
                                    {lawyer.office_name && <span>{lawyer.office_name}</span>}
                                </div>
                                {lawyer.bio && (
                                    <p className="mt-4 text-[13px] text-white/30 leading-relaxed line-clamp-2">
                                        {lawyer.bio}
                                    </p>
                                )}

                                {/* Contact buttons */}
                                {(hasPhone || hasWebsite) && (
                                    <div className="mt-5 flex items-center gap-2.5 flex-wrap">
                                        {hasPhone && (
                                            <div className="relative">
                                                <a
                                                    href={`tel:${lawyer.phone}`}
                                                    onClick={(e) => {
                                                        // On desktop, show number instead of calling
                                                        if (!/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                                                            e.preventDefault();
                                                            setShowPhone(!showPhone);
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                                                    style={{
                                                        background: `${lawyer.brand_color}20`,
                                                        color: lawyer.brand_color,
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                        <path d="M5.5 2H4C3.44772 2 3 2.44772 3 3V4C3 8.41828 6.58172 12 11 12H12C12.5523 12 13 11.5523 13 11V9.5L10.5 8.5L9.5 9.5C9.5 9.5 8 9 7 8C6 7 5.5 5.5 5.5 5.5L6.5 4.5L5.5 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    전화상담하기
                                                </a>
                                                {/* Phone number tooltip (desktop) */}
                                                <AnimatePresence>
                                                    {showPhone && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 4 }}
                                                            className="absolute left-0 bottom-full mb-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-lg border border-white/[0.08] text-white/80 text-[13px] font-medium tabular-nums whitespace-nowrap shadow-xl"
                                                        >
                                                            {lawyer.phone}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                        {hasWebsite && (
                                            <a
                                                href={lawyer.website_url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 bg-white/[0.04] border border-white/[0.08] hover:text-white/70 hover:bg-white/[0.08] transition-all"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.2" />
                                                    <path d="M1 7H13M7 1C8.5 2.5 9.5 4.5 9.5 7C9.5 9.5 8.5 11.5 7 13C5.5 11.5 4.5 9.5 4.5 7C4.5 4.5 5.5 2.5 7 1Z" stroke="currentColor" strokeWidth="1.2" />
                                                </svg>
                                                홈페이지
                                            </a>
                                        )}
                                    </div>
                                )}

                                <Link
                                    href={`/blog/${lawyer.slug}`}
                                    className="inline-flex items-center gap-2 mt-5 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors group"
                                >
                                    다른 글 보기
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                                        <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/[0.04] bg-[#0A0A0A]">
                <div className="max-w-[720px] mx-auto px-6 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-bold text-white/30 bg-white/[0.04]">M</div>
                        <span className="text-[11px] text-white/15">
                            Powered by{" "}
                            <Link href="/" className="text-white/25 hover:text-white/50 transition-colors font-medium">
                                macdee
                            </Link>
                        </span>
                    </div>
                    <span className="text-[10px] text-white/10 tracking-wider uppercase">AI Legal Marketing</span>
                </div>
            </footer>

            {/* Floating bottom CTA bar (mobile) */}
            {hasPhone && (
                <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 flex items-center gap-3">
                        <a
                            href={`tel:${lawyer.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white transition-all"
                            style={{ background: lawyer.brand_color }}
                        >
                            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                                <path d="M5.5 2H4C3.44772 2 3 2.44772 3 3V4C3 8.41828 6.58172 12 11 12H12C12.5523 12 13 11.5523 13 11V9.5L10.5 8.5L9.5 9.5C9.5 9.5 8 9 7 8C6 7 5.5 5.5 5.5 5.5L6.5 4.5L5.5 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            전화상담하기
                        </a>
                        {hasWebsite && (
                            <a
                                href={lawyer.website_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M1 7H13M7 1C8.5 2.5 9.5 4.5 9.5 7C9.5 9.5 8.5 11.5 7 13C5.5 11.5 4.5 9.5 4.5 7C4.5 4.5 5.5 2.5 7 1Z" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Share toast */}
            {shared && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-lg text-white/80 text-[12px] font-medium shadow-2xl border border-white/[0.08]"
                >
                    링크가 복사되었습니다 ✓
                </motion.div>
            )}

            {/* Schema.org Article */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        headline: post.title,
                        description: post.meta_description,
                        datePublished: post.created_at,
                        author: {
                            "@type": "Person",
                            name: lawyer.name,
                            jobTitle: "변호사",
                        },
                        publisher: {
                            "@type": "Organization",
                            name: "macdee",
                        },
                        keywords: (post.tags || []).join(", "),
                    }),
                }}
            />

            {/* FAQ Schema */}
            {post.schema_markup && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            ...(post.schema_markup as object),
                        }),
                    }}
                />
            )}
        </div>
    );
}
