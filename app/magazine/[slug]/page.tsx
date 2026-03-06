import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface Magazine {
    id: string;
    title: string;
    slug: string;
    body: string;
    excerpt: string;
    category: string;
    tags: string[];
    cover_image_url: string | null;
    meta_title: string;
    meta_description: string;
    view_count: number;
    published_at: string;
    author: string;
}

async function getMagazine(slug: string): Promise<Magazine | null> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
        const res = await fetch(`${baseUrl}/api/magazine/${slug}`, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.magazine;
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const magazine = await getMagazine(slug);
    if (!magazine) return { title: "기사를 찾을 수 없습니다" };

    return {
        title: magazine.meta_title || magazine.title,
        description: magazine.meta_description || magazine.excerpt,
        openGraph: {
            title: magazine.meta_title || magazine.title,
            description: magazine.meta_description || magazine.excerpt,
            images: magazine.cover_image_url ? [magazine.cover_image_url] : [],
            type: "article",
        },
    };
}

export default async function MagazineArticlePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const magazine = await getMagazine(slug);
    if (!magazine) notFound();

    // Simple markdown to HTML (headings, bold, lists, links)
    const bodyHtml = magazine.body
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-[#111] mt-8 mb-3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-[#111] mt-10 mb-4 pb-2 border-b border-[#E5E5E5]">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#111]">$1</strong>')
        .replace(/^- (.+)$/gm, '<li class="ml-4 pl-2 text-[#444]">$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 pl-2 text-[#444]"><span class="font-medium text-[#3563AE] mr-1">$1.</span> $2</li>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[#3563AE] underline hover:text-[#2A4F8A]" target="_blank">$1</a>')
        .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-6 w-full" />')
        .replace(/\n\n/g, '</p><p class="text-[#444] leading-relaxed mb-4">')
        .replace(/\n/g, "<br/>");

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <header className="bg-[#0A0A0A] border-b border-white/[0.06] sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/magazine" className="flex items-center gap-2">
                        <span className="text-lg font-bold tracking-tight text-white">macdee.</span>
                        <span className="text-[10px] font-medium text-white/30 tracking-[0.1em] uppercase">insights</span>
                    </Link>
                    <Link href="/magazine" className="text-sm text-white/40 hover:text-white transition-colors">
                        ← 목록으로
                    </Link>
                </div>
            </header>

            {/* Cover */}
            {magazine.cover_image_url && (
                <div className="w-full h-64 md:h-96 bg-[#0A0A0A] relative">
                    <img src={magazine.cover_image_url} alt={magazine.title}
                        className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                </div>
            )}

            {/* Article */}
            <article className="max-w-3xl mx-auto px-6 py-10">
                {/* Category & Date */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#3563AE] text-white">
                        {magazine.category}
                    </span>
                    <span className="text-sm text-white/30">
                        {magazine.published_at && new Date(magazine.published_at).toLocaleDateString("ko-KR", {
                            year: "numeric", month: "long", day: "numeric",
                        })}
                    </span>
                    <span className="text-sm text-white/20">· 👀 {magazine.view_count}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] leading-tight mb-6">
                    {magazine.title}
                </h1>

                {/* Excerpt */}
                <p className="text-lg text-white/40 leading-relaxed mb-10 pb-8 border-b border-white/[0.08] italic">
                    {magazine.excerpt}
                </p>

                {/* Body */}
                <div
                    className="prose-macdee text-white/60 leading-relaxed text-base [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-white/[0.08] [&_h3]:text-white/80 [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-3 [&_strong]:text-white/80 [&_a]:text-[#3563AE] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: `<p class="text-white/60 leading-relaxed mb-4">${bodyHtml}</p>` }}
                />

                {/* Tags */}
                {magazine.tags?.length > 0 && (
                    <div className="mt-12 pt-6 border-t border-white/[0.08]">
                        <div className="flex flex-wrap gap-2">
                            {magazine.tags.map((tag) => (
                                <span key={tag} className="px-3 py-1 rounded-full text-xs bg-white/[0.06] text-white/30">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Author */}
                <div className="mt-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/20 mb-1">작성자</p>
                    <p className="font-bold text-white">{magazine.author || "macdee 에디터"}</p>
                    <p className="text-sm text-white/25 mt-2">
                        macdee 개발팀과 법률 마케팅 전문가가 작성한 인사이트 콘텐츠입니다.
                    </p>
                </div>

                {/* CTA */}
                <div className="mt-8 text-center">
                    <Link href="/magazine" className="inline-block px-6 py-3 bg-white text-[#0A0A0A] rounded-full text-sm font-medium hover:bg-white/90 transition-colors">
                        다른 인사이트 보기 →
                    </Link>
                </div>
            </article>

            {/* Footer */}
            <footer className="bg-[#0A0A0A] border-t border-white/[0.06] text-white/20 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-sm">
                    © {new Date().getFullYear()} macdee. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
}
