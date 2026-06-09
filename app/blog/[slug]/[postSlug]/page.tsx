import { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { parseAiContent } from "@/lib/ai-content";
import PostPageClient from "./PostPageClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; postSlug: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, postSlug } = await params;
    const isUuid = UUID_RE.test(postSlug);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    try {
        const apiRes = await fetch(`${baseUrl}/api/blog/${slug}/${postSlug}`, { next: { revalidate: 60 } });
        if (!apiRes.ok) {
            return { title: "포스트를 찾을 수 없습니다" };
        }
        const json = await apiRes.json();
        const postData = json.post ?? null;
        const lawyerName = json.lawyer?.name || "";
        if (!postData) return { title: "포스트를 찾을 수 없습니다" };

        const canonicalSlug = postData.slug || postData.id || postSlug;
        const canonicalUrl = `${baseUrl}/blog/${slug}/${canonicalSlug}`;

        return {
            title: `${postData.title} | ${lawyerName} 변호사`,
            description: postData.meta_description || postData.title,
            keywords: (postData.tags || []).join(", "),
            alternates: { canonical: canonicalUrl },
            robots: { index: true, follow: true },
            openGraph: {
                title: postData.title,
                description: postData.meta_description || postData.title,
                type: "article",
                url: canonicalUrl,
                authors: [lawyerName],
                images: ["/og-image.png"],
            },
        };
    } catch {
        return { title: "포스트를 찾을 수 없습니다" };
    }

    // unreachable
}

export default async function PostPage({ params }: Props) {
    const { slug, postSlug } = await params;
    // 순수 service role 클라이언트 — 브라우저의 anon 쿠키가 RLS를 트리거해 published 글을
    // 못 찾는 문제 방지 (createAdminClient는 SSR 쿠키 기반이라 쿠키가 service role을 덮어씀)
    const supabase = createServiceClient();

    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, name, slug, specialty, region, bio, brand_color, office_name, experience_years, profile_image_url, phone")
        .eq("slug", slug).single();

    if (!lawyer) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B7280]">블로그를 찾을 수 없습니다.</p></div>;
    }

    // UUID URL → slug URL: 301 redirect to canonical slug URL when slug exists
    const isUuid = UUID_RE.test(postSlug);
    const postQuery = isUuid
        ? supabase.from("contents").select("*").eq("lawyer_id", lawyer.id).eq("id", postSlug).eq("status", "published")
        : supabase.from("contents").select("*").eq("lawyer_id", lawyer.id).eq("slug", postSlug).eq("status", "published");
    const { data: post } = await postQuery.maybeSingle();

    // slug에 한글이 포함되면 Location 헤더(ASCII 전용)에 그대로 넣을 수 없어 인코딩 필수
    if (isUuid && post?.slug) permanentRedirect(`/blog/${slug}/${encodeURIComponent(post.slug)}`);

    if (!post) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B7280]">포스트를 찾을 수 없습니다.</p></div>;
    }

    // Recent posts by same lawyer for internal linking
    const { data: relatedPostsData } = await supabase
        .from("contents")
        .select("id, title, slug, created_at")
        .eq("lawyer_id", lawyer.id)
        .in("channel", ["google", "macdee"])
        .eq("status", "published")
        .neq("id", post.id)
        .order("created_at", { ascending: false })
        .limit(4);

    // Related instagram card news (same upload_id)
    let cardNewsSlides: { slide: number; text: string }[] = [];
    let cardNewsCoverImage: string | null = null;
    if (post.upload_id) {
        const { data: instagramContent } = await supabase
            .from("contents")
            .select("body, card_news_data")
            .eq("upload_id", post.upload_id)
            .eq("channel", "instagram")
            .single();

        if (instagramContent?.body) {
            try {
                const parsed = JSON.parse(instagramContent.body);
                cardNewsSlides = Array.isArray(parsed) ? parsed : [];
            } catch { /* ignore */ }
        }
        if (instagramContent?.card_news_data?.coverImageUrl) {
            cardNewsCoverImage = instagramContent.card_news_data.coverImageUrl;
        }
    }

    // Parse JSON body if stored raw from AI (견고한 파서 + 안전망)
    let parsedTitle = post.title;
    let parsedBody = post.body || "";
    let parsedMeta = post.meta_description || "";
    if (parsedBody.trimStart().startsWith("```") || parsedBody.trimStart().startsWith("{")) {
        const parsed = parseAiContent(parsedBody);
        if (parsed?.body) {
            if (parsed.title) parsedTitle = parsed.title;
            parsedBody = parsed.body;
            if (parsed.meta_description && !parsedMeta) parsedMeta = parsed.meta_description;
        }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const canonicalPostSlug = post.slug || post.id;
    const canonicalUrl = `${baseUrl}/blog/${slug}/${canonicalPostSlug}`;

    // Word count for Article schema
    const plainText = parsedBody
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#*`_~>[\]()!]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: parsedTitle,
        description: parsedMeta || parsedTitle,
        datePublished: post.published_at || post.created_at,
        dateModified: post.updated_at || post.published_at || post.created_at,
        wordCount,
        author: {
            "@type": "Person",
            name: lawyer.name,
            jobTitle: "변호사",
            url: `${baseUrl}/blog/${slug}`,
        },
        publisher: {
            "@type": "Organization",
            name: "macdee",
            url: baseUrl,
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": canonicalUrl,
        },
        keywords: (post.tags || []).join(", "),
        ...(lawyer.profile_image_url ? { image: lawyer.profile_image_url } : {}),
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: baseUrl },
            { "@type": "ListItem", position: 2, name: `${lawyer.name} 변호사 블로그`, item: `${baseUrl}/blog/${slug}` },
            { "@type": "ListItem", position: 3, name: parsedTitle, item: canonicalUrl },
        ],
    };

    const relatedPosts = (relatedPostsData || []).map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug || p.id,
        created_at: p.created_at,
    }));

    // 구조화 데이터: 저장된 형태에 맞는 올바른 스키마 생성
    // - FAQ 배열 [{q,a}] (google 채널) → 표준 FAQPage (Question/Answer)
    // - @type 있는 객체 (macdee 채널 Attorney 등) → 그대로 사용
    // - 그 외 형태 불명 → 렌더하지 않음 (무효 스키마 방지)
    function buildSchemaJsonLd(raw: unknown): object | null {
        if (!raw) return null;
        if (Array.isArray(raw)) {
            const faqs = raw.filter(
                (it): it is { q: string; a: string } =>
                    !!it && typeof it === "object" && "q" in it && "a" in it && !!it.q && !!it.a
            );
            if (faqs.length === 0) return null;
            return {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map(f => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
            };
        }
        if (typeof raw === "object" && raw !== null && "@type" in raw) {
            return { "@context": "https://schema.org", ...(raw as object) };
        }
        return null;
    }
    const schemaJsonLd = buildSchemaJsonLd(post.schema_markup);

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
            {schemaJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
                />
            )}
            <PostPageClient
                lawyer={{ id: lawyer.id, name: lawyer.name, slug: lawyer.slug, specialty: lawyer.specialty || [], region: lawyer.region || "", bio: lawyer.bio || "", brand_color: lawyer.brand_color || "#3563AE", office_name: lawyer.office_name || "", experience_years: lawyer.experience_years || 0, profile_image_url: lawyer.profile_image_url || "", phone: lawyer.phone || null, website_url: (lawyer as Record<string, unknown>).website_url as string || null }}
                post={{ id: post.id, title: parsedTitle, slug: post.slug || post.id, body: parsedBody, meta_description: parsedMeta, tags: post.tags || [], schema_markup: post.schema_markup, created_at: post.published_at || post.created_at, card_news_slides: cardNewsSlides.length > 0 ? cardNewsSlides : undefined, card_news_cover_image: cardNewsCoverImage }}
                relatedPosts={relatedPosts}
            />
        </>
    );
}
