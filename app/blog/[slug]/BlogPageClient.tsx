"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import BlogSplash from "@/components/BlogSplash";

interface LawyerInfo {
    name: string;
    slug: string;
    specialty: string[];
    region: string;
    bio: string;
    office_name: string;
    experience_years: number;
    brand_color: string;
    profile_image_url: string;
}

interface PostItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    tags: string[];
    channel: string;
    created_at: string;
}

export default function BlogPageClient({ lawyer, posts }: { lawyer: LawyerInfo; posts: PostItem[] }) {
    const formatDate = (d: string) => {
        const date = new Date(d);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 24 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
        }),
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A]" style={{ fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
            {/* Splash entrance */}
            <BlogSplash name={lawyer.name} brandColor={lawyer.brand_color} />
            {/* Ambient gradient */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${lawyer.brand_color}08 0%, transparent 70%)`,
                }}
            />

            {/* Nav */}
            <nav className="relative z-10 border-b border-white/[0.06]">
                <div className="max-w-[960px] mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href={`/blog/${lawyer.slug}`} className="flex items-center gap-2 group">
                        <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white/90"
                            style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}, ${lawyer.brand_color}99)` }}
                        >
                            {lawyer.name.charAt(0)}
                        </div>
                        <span className="text-[15px] font-semibold text-white/90 tracking-tight group-hover:text-white transition-colors">
                            {lawyer.name}
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        {lawyer.specialty.length > 0 && (
                            <span className="text-[11px] text-white/25 tracking-wide uppercase hidden sm:block">
                                {lawyer.specialty[0]}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 pt-20 pb-16 sm:pt-28 sm:pb-20"
            >
                <div className="max-w-[960px] mx-auto px-6">
                    <div className="flex items-start gap-6 sm:gap-10">
                        {/* Profile photo or initial */}
                        <div className="flex-shrink-0">
                            {lawyer.profile_image_url ? (
                                <div className="relative w-20 h-20 sm:w-28 sm:h-28">
                                    <div
                                        className="w-full h-full rounded-2xl overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, ${lawyer.brand_color}20, transparent)`,
                                        }}
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
                                                mixBlendMode: "normal",
                                            }}
                                        />
                                    </div>
                                    {/* Subtle glow ring */}
                                    <div
                                        className="absolute -inset-0.5 rounded-2xl opacity-20 -z-10 blur-sm"
                                        style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}40, transparent)` }}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white/80"
                                    style={{ background: `linear-gradient(135deg, ${lawyer.brand_color}30, ${lawyer.brand_color}10)` }}
                                >
                                    {lawyer.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Text content */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-extrabold text-white leading-[1.15] tracking-tight">
                                {lawyer.name}
                                <span className="text-white/20 font-light ml-2">변호사</span>
                            </h1>
                            <p className="mt-1.5 text-[11px] text-white/15 tracking-[0.2em] uppercase font-light">
                                Attorney at Law
                            </p>

                            {lawyer.bio && (
                                <p className="mt-5 text-[15px] text-white/40 leading-relaxed max-w-lg">
                                    {lawyer.bio}
                                </p>
                            )}

                            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/25">
                                {lawyer.office_name && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full" style={{ background: lawyer.brand_color }} />
                                        {lawyer.office_name}
                                    </span>
                                )}
                                {lawyer.region && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full" style={{ background: lawyer.brand_color }} />
                                        {lawyer.region}
                                    </span>
                                )}
                                {lawyer.experience_years > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full" style={{ background: lawyer.brand_color }} />
                                        경력 {lawyer.experience_years}년
                                    </span>
                                )}
                                {lawyer.specialty.length > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full" style={{ background: lawyer.brand_color }} />
                                        {lawyer.specialty.join(" · ")}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Divider */}
            <div className="max-w-[960px] mx-auto px-6">
                <div className="h-px bg-white/[0.06]" />
            </div>

            {/* Posts */}
            <main className="relative z-10 max-w-[960px] mx-auto px-6 pt-12 pb-24">
                {/* Section label */}
                <div className="flex items-center justify-between mb-10">
                    <span className="text-[11px] text-white/20 tracking-[0.2em] uppercase font-medium">
                        Legal Insights
                    </span>
                    <span className="text-[11px] text-white/15 tabular-nums">
                        {posts.length}건
                    </span>
                </div>

                {posts.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="w-12 h-12 mx-auto mb-5 rounded-full border border-white/[0.08] flex items-center justify-center">
                            <span className="text-white/15 text-lg">✦</span>
                        </div>
                        <p className="text-sm text-white/20">아직 발행된 글이 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {posts.map((post, i) => (
                            <motion.div
                                key={post.id}
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                            >
                                <Link
                                    href={`/blog/${lawyer.slug}/${post.slug}`}
                                    className="group block py-8 border-b border-white/[0.05] hover:border-white/[0.1] transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
                                        {/* Date column */}
                                        <div className="flex-shrink-0 w-24">
                                            <span className="text-[12px] text-white/20 tabular-nums font-light tracking-wide">
                                                {formatDate(post.created_at)}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-[18px] sm:text-[20px] font-bold text-white/85 leading-snug tracking-tight group-hover:text-white transition-colors duration-300">
                                                {post.title}
                                            </h2>
                                            <p className="mt-3 text-[14px] text-white/30 leading-relaxed line-clamp-2 group-hover:text-white/40 transition-colors duration-300">
                                                {post.excerpt}
                                            </p>

                                            {/* Tags */}
                                            {post.tags.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {post.tags.slice(0, 3).map((tag, j) => (
                                                        <span
                                                            key={j}
                                                            className="text-[10px] px-2.5 py-1 rounded-full border border-white/[0.06] text-white/20 font-medium"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Arrow */}
                                        <div className="hidden sm:flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-full border border-white/[0.06] text-white/15 group-hover:border-white/20 group-hover:text-white/50 transition-all duration-300 mt-1">
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/[0.04] bg-[#0A0A0A]">
                <div className="max-w-[960px] mx-auto px-6 py-8 flex items-center justify-between">
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

            {/* Schema.org */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Attorney",
                        name: lawyer.name,
                        description: lawyer.bio,
                        areaServed: lawyer.region,
                        knowsAbout: lawyer.specialty,
                        worksFor: lawyer.office_name ? { "@type": "LegalService", name: lawyer.office_name } : undefined,
                    }),
                }}
            />
        </div>
    );
}
