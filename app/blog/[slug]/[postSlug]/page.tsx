import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cleanBody, parseAiContent } from "@/lib/ai-content";
import { compactSeoDescription } from "@/lib/public-content";
import { decodePathPart, getBlogLawyer, getBlogPost, getCardNews, getMovedBlogPost, getNeighbourPosts, isPostUuid, publicImageUrl, publicLawyerSlugFromPath } from "@/lib/lawyer-blog";
import { lawyerBlogTags, tagLawyerBlogPage } from "@/lib/lawyer-blog-cache";
import PostPageClient from "./PostPageClient";

// 변호사 블로그 글. 1시간 캐시(ISR)하고, 글을 고치거나 내리면 refreshLawyerBlog() 가 이 글의 태그로 바로 비운다.
// 데이터베이스를 읽지 못하면 예외(5xx — 캐시되지 않고, 이미 만든 페이지는 계속 나간다). 정말 없는 글만 404.
// 예전에는 force-dynamic 에, 메타데이터를 자기 사이트 API(/api/blog/...)를 한 번 더 불러 만들었다 — 이제 같은 조회를 함께 쓴다.
export const revalidate = 3600;

export function generateStaticParams(): { slug: string; postSlug: string }[] {
    return [];
}

type Props = { params: Promise<{ slug: string; postSlug: string }> };

/**
 * 주소 → 변호사·글. 정말 없으면 null. generateMetadata 와 페이지가 react cache() 로 같은 조회를 한 번만 한다.
 * moved: slug 로 못 찾았지만 주소 끝 6자(글 ID 앞 6자)로 찾은 글 — 제목이 바뀌어 slug 가 달라진 옛 주소다.
 */
async function loadPost(params: Props["params"]) {
    const { slug: rawSlug, postSlug: rawPostSlug } = await params;
    const slug = publicLawyerSlugFromPath(rawSlug);
    const postSlug = decodePathPart(rawPostSlug);
    if (!slug || !postSlug) return { slug, postSlug, lawyer: null, post: null, moved: null };
    const lawyer = await getBlogLawyer(slug);
    if (!lawyer) return { slug, postSlug, lawyer, post: null, moved: null };
    const post = await getBlogPost(lawyer.id, postSlug);
    return { slug, postSlug, lawyer, post, moved: post ? null : await getMovedBlogPost(lawyer.id, postSlug) };
}

/** 옛 주소 → 지금 주소로 영구 이동. 이동도 1시간 캐시되므로 그 글의 태그를 달아, 글 slug 가 또 바뀌거나 내려가면 바로 비운다. */
async function redirectMoved(slug: string, lawyerId: string, moved: { id: string; slug: string | null }): Promise<never> {
    await tagLawyerBlogPage(lawyerBlogTags.lawyer(lawyerId), lawyerBlogTags.post(moved.id));
    permanentRedirect(`/blog/${encodeURIComponent(slug)}/${encodeURIComponent(moved.slug || moved.id)}`);
}

/** 저장된 원고(JSON 이나 마크다운)를 화면용 제목·본문·요약으로. */
function readPost(post: { title: string; body: string | null; meta_description: string | null }) {
    let title = post.title;
    let body = post.body || "";
    let meta = post.meta_description || "";
    const parsed = parseAiContent(body);
    if (parsed?.body) {
        if (parsed.title) title = parsed.title;
        body = cleanBody(body);
        if (parsed.meta_description && !meta) meta = parsed.meta_description;
    }
    title = title.replace(/\s*-\s*(google|macdee|blog|instagram)\s*$/i, "").trim();
    return { title, body, meta, keywords: parsed?.keywords };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, lawyer, post, moved } = await loadPost(params);
    if (slug && lawyer && moved) await redirectMoved(slug, lawyer.id, moved);
    if (!slug || !lawyer || !post) {
        return { title: "포스트를 찾을 수 없습니다", robots: { index: false, follow: false } };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const canonicalUrl = `${baseUrl}/blog/${slug}/${post.slug || post.id}`;
    const { title, body, meta, keywords } = readPost(post);

    // Generate SEO description from content if not set
    const source = meta || body || title;
    const description = compactSeoDescription(source
        .replace(/#+\s/g, "") // Remove markdown headers
        .replace(/\*\*|__/g, "") // Remove bold
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
        .replace(/\n+/g, " ") // Replace newlines with space
        .trim());

    return {
        title: `${title} | ${lawyer.name} 변호사`,
        description,
        keywords: (post.tags || keywords || []).join(", "),
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
        openGraph: {
            title,
            description,
            type: "article",
            url: canonicalUrl,
            authors: [lawyer.name],
            images: [publicImageUrl(lawyer.profile_image_url) || "/og-image.png"],
        },
    };
}

export default async function PostPage({ params }: Props) {
    // 읽지 못하면 여기서 예외(5xx). null 은 정말 없는 것이다.
    const { slug, postSlug, lawyer, post, moved } = await loadPost(params);
    if (!slug || !postSlug || !lawyer) {
        await tagLawyerBlogPage();
        notFound();
    }
    if (!post) {
        // 제목이 바뀌어 slug 가 달라진 옛 주소 → 지금 주소로 영구 이동(구글이 색인을 새 주소로 옮긴다).
        if (moved) await redirectMoved(slug, lawyer.id, moved);
        // 아직 발행 전인 글 주소도 404 로 캐시된다 — 그 변호사의 글이 발행되면 list 태그로 함께 비운다.
        await tagLawyerBlogPage(lawyerBlogTags.lawyer(lawyer.id), lawyerBlogTags.list(lawyer.id));
        notFound();
    }
    await tagLawyerBlogPage(lawyerBlogTags.lawyer(lawyer.id), lawyerBlogTags.post(post.id));

    // UUID URL → slug URL: 301 redirect to canonical slug URL when slug exists
    // slug에 한글이 포함되면 Location 헤더(ASCII 전용)에 그대로 넣을 수 없어 인코딩 필수
    if (isPostUuid(postSlug) && post.slug) permanentRedirect(`/blog/${slug}/${encodeURIComponent(post.slug)}`);

    // 앞뒤 글(내부 링크)과 같은 원고의 카드뉴스 — 못 읽어도 본문은 낸다.
    const [relatedPostsData, cardNews] = await Promise.all([getNeighbourPosts(post), getCardNews(post.upload_id)]);

    const { title: parsedTitle, body: parsedBody, meta: parsedMeta } = readPost(post);

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
    const authorImage = publicImageUrl(lawyer.profile_image_url);

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
        ...(authorImage ? { image: authorImage } : {}),
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

    const relatedPosts = relatedPostsData.map(p => ({
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
                // website_url: 글 페이지는 지금까지 홈페이지 열을 읽지 않아 늘 null 이었다. 화면을 바꾸지 않으려 그대로 둔다.
                lawyer={{ id: lawyer.id, name: lawyer.name, slug: lawyer.slug, specialty: lawyer.specialty || [], region: lawyer.region || "", bio: lawyer.bio || "", brand_color: lawyer.brand_color || "#3563AE", office_name: lawyer.office_name || "", experience_years: lawyer.experience_years || 0, profile_image_url: lawyer.profile_image_url || "", phone: lawyer.phone || null, website_url: null }}
                post={{ id: post.id, title: parsedTitle, slug: post.slug || post.id, body: parsedBody, meta_description: parsedMeta, tags: post.tags || [], schema_markup: post.schema_markup, created_at: post.published_at || post.created_at, card_news_slides: cardNews.slides.length > 0 ? cardNews.slides : undefined, card_news_cover_image: cardNews.coverImage }}
                relatedPosts={relatedPosts}
            />
        </>
    );
}
