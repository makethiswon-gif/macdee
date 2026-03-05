import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "MACDEE 매거진 - 법률 정보 매거진",
    description: "변호사가 알려주는 실전 법률 정보. 이혼, 부동산, 형사, 상속 등 다양한 법률 분야의 최신 정보를 확인하세요.",
};

const CATEGORIES = ["전체", "법률정보", "판례분석", "법개정", "변호사칼럼", "생활법률", "기업법무"];

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

async function getMagazines(category?: string): Promise<{ magazines: Magazine[]; total: number }> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const params = new URLSearchParams();
    if (category && category !== "전체") params.set("category", category);

    try {
        const res = await fetch(`${baseUrl}/api/magazine?${params}`, { cache: "no-store" });
        if (!res.ok) return { magazines: [], total: 0 };
        return res.json();
    } catch {
        return { magazines: [], total: 0 };
    }
}

export default async function MagazinePage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const { category } = await searchParams;
    const { magazines } = await getMagazines(category);

    return (
        <div className="min-h-screen bg-[#FAFAF9]">
            {/* Header */}
            <header className="bg-white border-b border-[#E5E5E5]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/magazine" className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tight text-[#111]">MACDEE</span>
                        <span className="text-xs font-medium text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">MAGAZINE</span>
                    </Link>
                    <Link href="/" className="text-sm text-[#888] hover:text-[#111] transition-colors">
                        맥디 홈으로
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-br from-[#0B0F1A] to-[#1A2744] text-white py-16">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        법률 매거진
                    </h1>
                    <p className="text-[#9CA3B0] text-lg max-w-xl mx-auto">
                        변호사가 직접 알려주는 실전 법률 정보.<br />
                        어려운 법을 쉽게, 필요한 것만 정확하게.
                    </p>
                </div>
            </section>

            {/* Category Tabs */}
            <div className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
                        {CATEGORIES.map((cat) => (
                            <Link
                                key={cat}
                                href={cat === "전체" ? "/magazine" : `/magazine?category=${cat}`}
                                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${(category === cat || (!category && cat === "전체"))
                                        ? "bg-[#0B0F1A] text-white font-medium"
                                        : "text-[#666] hover:bg-[#F5F5F5]"
                                    }`}
                            >
                                {cat}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className="max-w-6xl mx-auto px-6 py-10">
                {magazines.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-5xl mb-4">📰</p>
                        <p className="text-[#888] text-lg">아직 게시된 글이 없습니다</p>
                        <p className="text-[#AAA] text-sm mt-1">곧 유익한 법률 정보로 찾아뵙겠습니다!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {magazines.map((article, i) => (
                            <Link
                                key={article.id}
                                href={`/magazine/${article.slug}`}
                                className={`group block rounded-2xl overflow-hidden bg-white border border-[#E5E5E5] hover:shadow-lg hover:border-[#CCC] transition-all duration-300 ${i === 0 ? "md:col-span-2 lg:col-span-2" : ""
                                    }`}
                            >
                                {/* Cover Image */}
                                <div className={`relative overflow-hidden bg-gradient-to-br from-[#0B0F1A] to-[#1A2744] ${i === 0 ? "h-72" : "h-48"
                                    }`}>
                                    {article.cover_image_url ? (
                                        <img
                                            src={article.cover_image_url}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-4xl opacity-20">📰</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F59E0B] text-black">
                                            {article.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h2 className={`font-bold text-[#111] group-hover:text-[#3563AE] transition-colors line-clamp-2 ${i === 0 ? "text-xl" : "text-base"
                                        }`}>
                                        {article.title}
                                    </h2>
                                    <p className="text-sm text-[#666] mt-2 line-clamp-2">{article.excerpt}</p>
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F0F0F0]">
                                        <span className="text-[11px] text-[#999]">
                                            {article.published_at && new Date(article.published_at).toLocaleDateString("ko-KR", {
                                                year: "numeric", month: "long", day: "numeric",
                                            })}
                                        </span>
                                        <span className="text-[11px] text-[#999]">👀 {article.view_count}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-[#0B0F1A] text-[#6B7280] py-10">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-sm">© {new Date().getFullYear()} MACDEE. 법률 AI 플랫폼</p>
                </div>
            </footer>
        </div>
    );
}
