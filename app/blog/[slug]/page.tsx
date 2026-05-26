import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import BlogPageClient from "./BlogPageClient";

export const revalidate = 1800;

type Props = { 
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createAdminClient();
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("name, specialty, region, bio")
        .eq("slug", slug)
        .single();

    if (!lawyer) return { title: "블로그를 찾을 수 없습니다" };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const specialties = (lawyer.specialty || []).join(", ");
    return {
        title: `${lawyer.name} 변호사 블로그 | ${specialties}`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼 블로그. ${specialties} 전문.`,
        alternates: {
            canonical: `${baseUrl}/blog/${slug}`,
        },
        robots: {
            index: true,
            follow: true,
        },
        openGraph: {
            title: `${lawyer.name} 변호사 블로그`,
            description: lawyer.bio || `${specialties} 전문 변호사`,
            type: "website",
            url: `${baseUrl}/blog/${slug}`,
        },
    };
}

export default async function BlogPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const resolvedParams = searchParams ? await searchParams : {};
    const page = parseInt(resolvedParams.page as string) || 1;
    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Fetch data server-side
    const supabase = await createAdminClient();
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
        .select("id, title, body, meta_description, tags, channel, created_at, published_at, status", { count: "exact" })
        .eq("lawyer_id", lawyer.id)
        .in("channel", ["google", "macdee"])
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(start, end);

    const totalPages = count ? Math.ceil(count / limit) : 1;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    // Lawyer blog JSON-LD: Person + Blog listing
    const blogJsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${lawyer.name} 변호사 블로그`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼`,
        url: `${baseUrl}/blog/${slug}`,
        author: {
            "@type": "Person",
            name: lawyer.name,
            jobTitle: "변호사",
            worksFor: lawyer.office_name ? { "@type": "LegalService", name: lawyer.office_name } : undefined,
            knowsAbout: lawyer.specialty || [],
        },
        blogPost: (posts || []).slice(0, 10).map(p => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${baseUrl}/blog/${slug}/${p.id}`,
            datePublished: p.published_at || p.created_at,
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

    // Helper: parse post body (handles raw JSON or markdown)
    function parsePost(p: { id: string; title: string; body: string; meta_description: string | null; tags: string[] | null; channel: string; created_at: string; published_at: string | null; status: string }) {
        let title = p.title;
        let body = p.body || "";
        let excerpt = p.meta_description || "";

        // Try to parse JSON body (stored raw from AI)
        const trimmed = body.trim();
        if (trimmed.startsWith("```") || trimmed.startsWith("{") || trimmed.startsWith("\"")) {
            try {
                const cleanJson = trimmed.replace(/^[\s]*```(?:json)?\s*\n?/, "").replace(/\n?\s*```[\s]*$/, "").trim();
                const parsed = JSON.parse(cleanJson);
                if (parsed.title) title = parsed.title;
                if (parsed.body) body = parsed.body;
                if (parsed.meta_description && !excerpt) excerpt = parsed.meta_description;
            } catch { /* keep original */ }
        }

        // Strip markdown for excerpt
        const plainBody = stripMarkdown(body);
        if (!excerpt) {
            excerpt = plainBody.substring(0, 150) + "...";
        } else {
            excerpt = stripMarkdown(excerpt);
        }

        // Remove channel suffix from title (e.g. "제목 - google")
        title = title.replace(/\s*-\s*(google|macdee|blog|instagram)\s*$/i, "").trim();

        return { id: p.id, title, slug: p.id, excerpt, tags: p.tags || [], channel: p.channel, created_at: p.published_at || p.created_at };
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
            currentPage={page}
            totalPages={totalPages}
            totalCount={count || 0}
        />
        </>
    );
}
