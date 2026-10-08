import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cleanBody, parseAiContent } from "@/lib/ai-content";
import { compactSeoDescription } from "@/lib/public-content";
import { BLOG_PAGE_SIZE, getBlogArchive, getBlogLawyer, getBlogListPage, publicImageUrl, publicLawyerSlugFromPath, type BlogListPost } from "@/lib/lawyer-blog";
import { lawyerBlogTags, tagLawyerBlogPage } from "@/lib/lawyer-blog-cache";
import BlogPageClient from "./BlogPageClient";

// 변호사 블로그 홈(1쪽: /blog/{변호사})과 글 목록 2쪽부터(?page=N → 미들웨어가 /blog/{변호사}/p/N 으로 넘김)가 함께 쓰는 화면.
// 두 경로 모두 ISR(1시간)이고, 글이 생기거나 빠지면 refreshLawyerBlog() 가 lawyerBlogTags.list 로 비운다.

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

/** 1쪽은 /blog/{변호사}, 2쪽부터는 각자 자기 주소(?page=N)를 canonical 로 — 2쪽 이후를 1쪽으로 합치면 구글이 그 쪽의 글 링크를 덜 따라간다. */
function blogPageUrl(slug: string, page: number) {
    return `${baseUrl()}/blog/${slug}${page > 1 ? `?page=${page}` : ""}`;
}

export async function blogHomeMetadata(rawSlug: string, page: number): Promise<Metadata> {
    const slug = publicLawyerSlugFromPath(rawSlug);
    if (!slug) return { title: "블로그를 찾을 수 없습니다", robots: { index: false, follow: false } };
    const lawyer = await getBlogLawyer(slug);
    if (!lawyer) return { title: "블로그를 찾을 수 없습니다", robots: { index: false, follow: false } };
    const { total } = await getBlogListPage(lawyer.id, page);

    const specialties = (lawyer.specialty || []).join(", ");
    const description = compactSeoDescription(lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼 블로그. ${specialties} 전문.`);
    const keywords = [...(lawyer.specialty || []), lawyer.region, "변호사", "블로그", "법률 칼럼"].filter((value): value is string => !!value);
    const url = blogPageUrl(slug, page);

    return {
        title: page > 1 ? `${lawyer.name} 변호사 블로그 · ${page}페이지 | ${specialties}` : `${lawyer.name} 변호사 블로그 | ${specialties}`,
        description,
        keywords,
        alternates: { canonical: url },
        robots: { index: total > 0, follow: true },
        openGraph: {
            title: `${lawyer.name} 변호사 블로그`,
            description,
            type: "website",
            url,
            images: [publicImageUrl(lawyer.profile_image_url) || "/og-image.png"],
        },
    };
}

// Helper: strip markdown syntax for plain text excerpts
function stripMarkdown(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, "")     // headings
        .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
        .replace(/\*(.*?)\*/g, "$1")       // *italic*
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // [link](url)
        .replace(/^>\s*/gm, "")            // blockquotes
        .replace(/^\s*[-*_]{3,}\s*$/gm, "") // horizontal rules
        .replace(/[`~]/g, "")              // code/tilde markers
        .replace(/\\(["'`\\/])/g, "$1") // escaped quotes and slashes
        .replace(/^[-*]\s+/gm, "")        // list items
        .replace(/\n{2,}/g, " ")          // multiple newlines
        .replace(/\n/g, " ")              // single newlines
        .replace(/\s{2,}/g, " ")          // collapse whitespace
        .trim();
}

function normalizeTitle(title: string) {
    return title.replace(/\s*-\s*(google|macdee|blog|instagram)\s*$/i, "").trim();
}

// Helper: parse post body (handles raw JSON or markdown)
function parsePost(p: BlogListPost) {
    let title = p.title;
    const rawBody = p.body || "";
    let body = rawBody;
    let excerpt = p.meta_description || "";

    const parsed = parseAiContent(rawBody);
    if (parsed?.title) title = parsed.title;
    if (parsed?.body) body = cleanBody(rawBody);
    if (parsed?.meta_description && !excerpt) excerpt = parsed.meta_description;

    // Strip markdown for excerpt
    const plainBody = stripMarkdown(body);
    if (!excerpt) {
        excerpt = plainBody.substring(0, 150) + "...";
    } else {
        excerpt = stripMarkdown(excerpt);
    }

    // Remove channel suffix from title (e.g. "제목 - google")
    title = normalizeTitle(title);

    return { id: p.id, title, slug: p.slug || p.id, excerpt, tags: p.tags || [], channel: p.channel, created_at: p.created_at };
}

/** 페이지 컴포넌트가 그대로 돌려준다 — notFound()·예외가 페이지 자체에서 나도록 컴포넌트가 아니라 함수로 부른다. */
export async function renderBlogHome(rawSlug: string, page: number) {
    const slug = publicLawyerSlugFromPath(rawSlug);
    if (!slug) {
        await tagLawyerBlogPage();
        notFound();
    }

    // 읽지 못하면 여기서 예외(5xx, 캐시 안 됨). null 은 정말 없는 변호사다.
    const lawyer = await getBlogLawyer(slug);
    if (!lawyer) {
        await tagLawyerBlogPage();
        notFound();
    }

    const [{ posts, total }, archive] = await Promise.all([
        getBlogListPage(lawyer.id, page),
        page === 1 ? getBlogArchive(lawyer.id) : Promise.resolve([]),
    ]);
    await tagLawyerBlogPage(lawyerBlogTags.lawyer(lawyer.id), lawyerBlogTags.list(lawyer.id));

    const totalPages = total ? Math.ceil(total / BLOG_PAGE_SIZE) : 1;
    if (page > totalPages) {
        notFound();
    }

    const url = baseUrl();

    // Lawyer blog JSON-LD: Attorney + Blog listing
    const blogJsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${lawyer.name} 변호사 블로그`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼`,
        url: `${url}/blog/${slug}`,
        author: {
            "@type": "Attorney",
            name: lawyer.name,
            jobTitle: "변호사",
            description: lawyer.bio || undefined,
            // 엔티티 연결(이름 검색 신뢰도) — 실제 프로필/사이트를 sameAs·url로 명시
            url: lawyer.website_url || `${url}/blog/${slug}`,
            sameAs: lawyer.website_url ? [lawyer.website_url] : undefined,
            knowsAbout: lawyer.specialty || [],
            areaServed: lawyer.region || undefined,
            hasCredential: "대한변호사협회 등록",
            yearsOfExperience: lawyer.experience_years || undefined,
            worksFor: lawyer.office_name
                ? {
                    "@type": "LegalService",
                    name: lawyer.office_name,
                    address: lawyer.office_address
                        ? { "@type": "PostalAddress", streetAddress: lawyer.office_address, addressCountry: "KR" }
                        : undefined,
                }
                : undefined,
        },
        blogPost: posts.slice(0, BLOG_PAGE_SIZE).map(p => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${url}/blog/${slug}/${p.slug || p.id}`,
            datePublished: p.created_at,
        })),
    };

    return (
        <>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
        />
        <BlogPageClient
            lawyer={{
                id: lawyer.id,
                name: lawyer.name,
                slug: lawyer.slug,
                specialty: lawyer.specialty || [],
                region: lawyer.region || "",
                bio: lawyer.bio || "",
                office_name: lawyer.office_name || "",
                experience_years: lawyer.experience_years || 0,
                brand_color: lawyer.brand_color || "#3563AE",
                profile_image_url: lawyer.profile_image_url || "",
            }}
            posts={posts.map(parsePost)}
            archivePosts={archive.map((post) => ({
                id: post.id,
                title: normalizeTitle(post.title),
                slug: post.slug || post.id,
                created_at: post.created_at,
            }))}
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
        />
        </>
    );
}
