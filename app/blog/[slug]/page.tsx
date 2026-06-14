import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanBody, parseAiContent } from "@/lib/ai-content";
import { isPublicLawyerSlug } from "@/lib/public-content";
import BlogPageClient from "./BlogPageClient";

export const dynamic = "force-dynamic";

type Props = { 
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

function parsePageNumber(value: string | string[] | undefined): number {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number.parseInt(raw || "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug);
    if (!isPublicLawyerSlug(slug)) return { title: "블로그를 찾을 수 없습니다", robots: { index: false, follow: false } };
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const page = parsePageNumber(resolvedSearchParams.page);

    const supabase = createServiceClient();
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("name, specialty, region, bio, profile_image_url")
        .eq("slug", slug)
        .single();

    if (!lawyer) return { title: "블로그를 찾을 수 없습니다" };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const specialties = (lawyer.specialty || []).join(", ");
    const keywords = [
        ...((lawyer.specialty || []) as string[]),
        lawyer.region,
        "변호사",
        "블로그",
        "법률 칼럼",
    ].filter(Boolean);

    return {
        title: `${lawyer.name} 변호사 블로그 | ${specialties}`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼 블로그. ${specialties} 전문.`,
        keywords,
        alternates: {
            canonical: `${baseUrl}/blog/${slug}`,
        },
        robots: {
            index: page === 1,
            follow: true,
        },
        openGraph: {
            title: `${lawyer.name} 변호사 블로그`,
            description: lawyer.bio || `${specialties} 전문 변호사`,
            type: "website",
            url: `${baseUrl}/blog/${slug}`,
            images: lawyer.profile_image_url ? [lawyer.profile_image_url] : ["/og-image.png"],
        },
    };
}

export default async function BlogPage({ params, searchParams }: Props) {
    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug);
    if (!isPublicLawyerSlug(slug)) {
        notFound();
    }

    const resolvedParams = searchParams ? await searchParams : {};
    const page = parsePageNumber(resolvedParams.page);
    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Fetch data server-side
    const supabase = createServiceClient();
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, name, slug, specialty, region, bio, profile_image_url, office_name, experience_years, brand_color")
        .eq("slug", slug)
        .single();

    if (!lawyer) {
        notFound();
    }

    const { data: posts, count } = await supabase
        .from("contents")
        .select("id, slug, title, body, meta_description, tags, channel, created_at, status", { count: "exact" })
        .eq("lawyer_id", lawyer.id)
        .in("channel", ["google", "macdee"])
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(start, end);

    const archivePostsQuery = page === 1
        ? await supabase
            .from("contents")
            .select("id, slug, title, created_at")
            .eq("lawyer_id", lawyer.id)
            .in("channel", ["google", "macdee"])
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .range(10, 69)
        : { data: [] };

    const totalPages = count ? Math.ceil(count / limit) : 1;
    if (page > totalPages) {
        notFound();
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    // Lawyer blog JSON-LD: Attorney + Blog listing
    const blogJsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${lawyer.name} 변호사 블로그`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼`,
        url: `${baseUrl}/blog/${slug}`,
        author: {
            "@type": "Attorney",
            name: lawyer.name,
            jobTitle: "변호사",
            knowsAbout: lawyer.specialty || [],
            areaServed: lawyer.region || undefined,
            hasCredential: "대한변호사협회 등록",
            yearsOfExperience: lawyer.experience_years || undefined,
            worksFor: lawyer.office_name ? { "@type": "LegalService", name: lawyer.office_name } : undefined,
        },
        blogPost: (posts || []).slice(0, 10).map(p => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${baseUrl}/blog/${slug}/${(p as { slug?: string | null }).slug || p.id}`,
            datePublished: p.created_at,
        })),
    };

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
    function parsePost(p: { id: string; slug: string | null; title: string; body: string; meta_description: string | null; tags: string[] | null; channel: string; created_at: string; status: string }) {
        let title = p.title;
        let body = p.body || "";
        let excerpt = p.meta_description || "";

        const parsed = parseAiContent(body);
        if (parsed?.title) title = parsed.title;
        if (parsed?.body) body = cleanBody(body);
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
            posts={(posts || []).map(parsePost)}
            archivePosts={(archivePostsQuery.data || []).map((post) => ({
                id: post.id,
                title: normalizeTitle(post.title),
                slug: post.slug || post.id,
                created_at: post.created_at,
            }))}
            currentPage={page}
            totalPages={totalPages}
            totalCount={count || 0}
        />
        </>
    );
}
