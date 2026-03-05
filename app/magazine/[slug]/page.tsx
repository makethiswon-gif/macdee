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
        <div className="min-h-screen bg-[#FAFAF9]">
            {/* Header */}
            <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/magazine" className="flex items-center gap-2">
                        <span className="text-lg font-black tracking-tight text-[#111]">MACDEE</span>
                        <span className="text-[10px] font-medium text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">MAGAZINE</span>
                    </Link>
                    <Link href="/magazine" className="text-sm text-[#888] hover:text-[#111] transition-colors">
                        ← 목록으로
                    </Link>
                </div>
            </header>

            {/* Cover */}
            {magazine.cover_image_url && (
                <div className="w-full h-64 md:h-96 bg-[#0B0F1A] relative">
                    <img src={magazine.cover_image_url} alt={magazine.title}
                        className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] to-transparent" />
                </div>
            )}

            {/* Article */}
            <article className="max-w-3xl mx-auto px-6 py-10">
                {/* Category & Date */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F59E0B] text-black">
                        {magazine.category}
                    </span>
                    <span className="text-sm text-[#999]">
                        {magazine.published_at && new Date(magazine.published_at).toLocaleDateString("ko-KR", {
                            year: "numeric", month: "long", day: "numeric",
                        })}
                    </span>
                    <span className="text-sm text-[#999]">· 👀 {magazine.view_count}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-black text-[#111] tracking-tight leading-tight mb-6">
                    {magazine.title}
                </h1>

                {/* Excerpt */}
                <p className="text-lg text-[#666] leading-relaxed mb-10 pb-8 border-b border-[#E5E5E5] italic">
                    {magazine.excerpt}
                </p>

                {/* Body */}
                <div
                    className="prose-macdee text-[#444] leading-relaxed text-base"
                    dangerouslySetInnerHTML={{ __html: `<p class="text-[#444] leading-relaxed mb-4">${bodyHtml}</p>` }}
                />

                {/* Tags */}
                {magazine.tags?.length > 0 && (
                    <div className="mt-12 pt-6 border-t border-[#E5E5E5]">
                        <div className="flex flex-wrap gap-2">
                            {magazine.tags.map((tag) => (
                                <span key={tag} className="px-3 py-1 rounded-full text-xs bg-[#F0F0F0] text-[#666]">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Author */}
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-[#0B0F1A] to-[#1A2744] text-white">
                    <p className="text-xs text-[#9CA3B0] mb-1">작성자</p>
                    <p className="font-bold">{magazine.author || "MACDEE 에디터"}</p>
                    <p className="text-sm text-[#6B7280] mt-2">
                        본 콘텐츠는 AI 법률 플랫폼 MACDEE(맥디)의 자체 편집팀이 작성한 법률 정보 기사입니다.
                    </p>
                </div>

                {/* CTA */}
                <div className="mt-8 text-center">
                    <Link href="/magazine" className="inline-block px-6 py-3 bg-[#0B0F1A] text-white rounded-xl text-sm font-medium hover:bg-[#1A2744] transition-colors">
                        다른 기사 보기 →
                    </Link>
                </div>
            </article>

            {/* Footer */}
            <footer className="bg-[#0B0F1A] text-[#6B7280] py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-sm">
                    © {new Date().getFullYear()} MACDEE. 법률 AI 플랫폼
                </div>
            </footer>
        </div>
    );
}
