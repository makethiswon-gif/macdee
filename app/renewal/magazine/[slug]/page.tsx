import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { Container } from "@/components/renewal/primitives";
import { renderMagazineBody } from "@/lib/renewal/markdown";
import { COMPANY, DEMO_BASE, path } from "@/data/renewal/site";
import { renewalRobots } from "../../flags";

// 매거진 상세 리스킨 (Phase 8).
// slug·URL 은 절대 불변(계획서 §1.2). 교체 시 이 디렉터리가
// app/magazine/[slug] 를 대체한다. 다크 SaaS 잔재와 macdee CTA 를 걷어내고
// 리뉴얼 헤더/푸터 아래에서 editorial 본문으로 보여준다.
export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

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
    updated_at: string | null;
    author: string;
}

async function getMagazine(slug: string): Promise<Magazine | null> {
    try {
        const decodedSlug = decodeURIComponent(slug);
        const supabase = createServiceClient();
        const { data, error } = await supabase
            .from("magazines")
            .select("*")
            .eq("slug", decodedSlug)
            .eq("status", "published")
            .single();
        if (error || !data) return null;
        return data;
    } catch {
        return null;
    }
}

function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const magazine = await getMagazine(slug);
    if (!magazine) return { title: "기사를 찾을 수 없습니다" };

    // canonical 은 최종 URL(/magazine/slug). 데모 기간에는 라이브 기사로
    // 정규화되고, 교체 후에는 자기 자신이 된다. (목록 page.tsx 주석 참고)
    const canonicalUrl = `${BASE_URL}/magazine/${magazine.slug}`;
    const title = `${magazine.meta_title || magazine.title} | MAKETHIS1 Insights`;
    const description = magazine.meta_description || magazine.excerpt;

    return {
        title: { absolute: title },
        description,
        keywords: [...(magazine.tags || []), "변호사", "법률", "법률 정보"].filter(Boolean),
        alternates: { canonical: canonicalUrl },
        robots: renewalRobots(),
        openGraph: {
            title: magazine.meta_title || magazine.title,
            description,
            images: [magazine.cover_image_url || `${BASE_URL}/og-image.png`],
            type: "article",
            url: canonicalUrl,
        },
    };
}

export default async function InsightArticlePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const magazine = await getMagazine(slug);
    if (!magazine) notFound();

    // 조회수는 교체 후(DEMO_BASE === "")에만 올린다.
    // 데모 검토 트래픽이 라이브 지표를 오염시키면 안 된다.
    if (DEMO_BASE === "") {
        try {
            const supabase = createServiceClient();
            supabase
                .from("magazines")
                .update({ view_count: (magazine.view_count || 0) + 1 })
                .eq("id", magazine.id)
                .then(() => {});
        } catch {
            // 조회수는 실패해도 본문을 막지 않는다
        }
    }

    // 관련 글 — GEO 구조(§23)의 내부링크 요건. 같은 카테고리 우선, 부족하면 최신순.
    let related: Pick<Magazine, "id" | "title" | "slug" | "category" | "published_at">[] = [];
    try {
        const supabase = createServiceClient();
        const { data: sameCat } = await supabase
            .from("magazines")
            .select("id, title, slug, category, published_at")
            .eq("status", "published")
            .eq("category", magazine.category)
            .neq("id", magazine.id)
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(3);
        related = sameCat || [];
        if (related.length < 3) {
            const { data: latest } = await supabase
                .from("magazines")
                .select("id, title, slug, category, published_at")
                .eq("status", "published")
                .neq("id", magazine.id)
                .order("published_at", { ascending: false, nullsFirst: false })
                .limit(6);
            for (const m of latest || []) {
                if (related.length >= 3) break;
                if (!related.some((r) => r.id === m.id)) related.push(m);
            }
        }
    } catch {
        related = [];
    }

    const bodyHtml = renderMagazineBody(magazine.body);
    const canonicalUrl = `${BASE_URL}/magazine/${magazine.slug}`;

    const plainText = magazine.body
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#*`_~>[\]()!]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: magazine.title,
        description: magazine.meta_description || magazine.excerpt,
        datePublished: magazine.published_at,
        dateModified: magazine.updated_at || magazine.published_at,
        wordCount,
        author: {
            "@type": "Person",
            name: magazine.author || "MAKETHIS1 편집팀",
            url: `${BASE_URL}/about`,
        },
        publisher: { "@type": "Organization", name: COMPANY.brand, url: BASE_URL },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        ...(magazine.cover_image_url ? { image: magazine.cover_image_url } : {}),
        keywords: (magazine.tags || []).join(", "),
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Insights", item: `${BASE_URL}/magazine` },
            { "@type": "ListItem", position: 3, name: magazine.title, item: canonicalUrl },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <article className="pt-[130px] md:pt-[160px] pb-[88px] md:pb-[140px]">
                <Container>
                    <div className="max-w-[720px] mx-auto">
                        {/* ── 헤드 ── */}
                        <Link
                            href={path("/magazine")}
                            className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-60"
                            style={{ color: "var(--mt-gray)" }}
                        >
                            ← Insights
                        </Link>

                        <div className="mt-10 flex items-center gap-3">
                            {magazine.category && (
                                <span className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    {magazine.category}
                                </span>
                            )}
                            <span className="mt-num text-[12px]" style={{ color: "var(--mt-gray-light)" }}>
                                {formatDate(magazine.published_at)}
                            </span>
                        </div>

                        <h1 className="mt-h1 mt-6">{magazine.title}</h1>

                        {magazine.excerpt && (
                            <p
                                className="mt-body-lg mt-8 pb-10"
                                style={{ borderBottom: "1px solid var(--mt-line)" }}
                            >
                                {magazine.excerpt}
                            </p>
                        )}

                        {/* ── 커버 ── */}
                        {magazine.cover_image_url && (
                            <div
                                className="mt-12 overflow-hidden rounded-[4px]"
                                style={{ border: "1px solid var(--mt-line)" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={magazine.cover_image_url}
                                    alt={magazine.title}
                                    className="w-full h-auto"
                                />
                            </div>
                        )}

                        {/* ── 본문 ── */}
                        <div
                            className="mt-article mt-12"
                            dangerouslySetInnerHTML={{ __html: bodyHtml }}
                        />

                        {/* ── 태그 ── */}
                        {magazine.tags?.length > 0 && (
                            <div
                                className="mt-16 pt-8 flex flex-wrap gap-x-5 gap-y-2"
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                            >
                                {magazine.tags.map((tag) => (
                                    <span key={tag} className="text-[12.5px]" style={{ color: "var(--mt-gray)" }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* ── 작성 정보 — GEO 구조 §23-7 (작성/검수 주체 명시) ── */}
                        <div
                            className="mt-10 p-7 rounded-[4px]"
                            style={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)" }}
                        >
                            <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                Written by
                            </p>
                            <p className="mt-3 text-[15px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                {magazine.author || "MAKETHIS1 편집팀"}
                            </p>
                            <p className="mt-body mt-2 text-[13.5px]">
                                MAKETHIS1 편집팀이 작성하는 법률 마케팅 인사이트입니다. 기자·방송작가
                                출신이 쓰고, 법학 전공자가 법률 표현을 검수합니다.
                            </p>
                            {(magazine.updated_at || magazine.published_at) && (
                                <p className="mt-num mt-4 text-[12px]" style={{ color: "var(--mt-gray-light)" }}>
                                    최종 업데이트 {formatDate(magazine.updated_at || magazine.published_at)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── 관련 글 ── */}
                    {related.length > 0 && (
                        <div className="max-w-[720px] mx-auto mt-20">
                            <p className="mt-en mt-label mb-2" style={{ color: "var(--mt-gray)" }}>
                                Related
                            </p>
                            <ul>
                                {related.map((r) => (
                                    <li key={r.id} style={{ borderBottom: "1px solid var(--mt-line)" }}>
                                        <Link
                                            href={path(`/magazine/${r.slug}`)}
                                            className="group flex items-baseline justify-between gap-6 py-5"
                                        >
                                            <span className="text-[15px] font-medium leading-[1.5]">
                                                <span className="mt-underline">{r.title}</span>
                                            </span>
                                            <span
                                                className="mt-num text-[11.5px] shrink-0"
                                                style={{ color: "var(--mt-gray-light)" }}
                                            >
                                                {formatDate(r.published_at)}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Container>
            </article>
        </>
    );
}
