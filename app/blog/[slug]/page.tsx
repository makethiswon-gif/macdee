import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import BlogPageClient from "./BlogPageClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createAdminClient();
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("name, specialty, region, bio")
        .eq("slug", slug)
        .single();

    if (!lawyer) return { title: "블로그를 찾을 수 없습니다" };

    const specialties = (lawyer.specialty || []).join(", ");
    return {
        title: `${lawyer.name} 변호사 블로그 | ${specialties}`,
        description: lawyer.bio || `${lawyer.name} 변호사의 법률 칼럼 블로그. ${specialties} 전문.`,
        openGraph: {
            title: `${lawyer.name} 변호사 블로그`,
            description: lawyer.bio || `${specialties} 전문 변호사`,
            type: "website",
        },
    };
}

export default async function BlogPage({ params }: Props) {
    const { slug } = await params;

    // Fetch data server-side
    const supabase = await createAdminClient();
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, name, slug, specialty, region, bio, profile_image_url, office_name, experience_years, brand_color")
        .eq("slug", slug)
        .single();

    if (!lawyer) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
                <div className="text-center">
                    <p className="text-6xl mb-4">📭</p>
                    <h1 className="text-xl font-bold text-[#1F2937]">블로그를 찾을 수 없습니다</h1>
                    <p className="mt-2 text-sm text-[#6B7280]">URL을 확인해주세요.</p>
                </div>
            </div>
        );
    }

    console.log(`[Blog Page] Querying posts for lawyer_id=${lawyer.id}, slug=${slug}`);

    const { data: posts, error: postsError } = await supabase
        .from("contents")
        .select("id, title, body, meta_description, tags, channel, created_at, status")
        .eq("lawyer_id", lawyer.id)
        .in("channel", ["google", "macdee"])
        .eq("status", "published")
        .order("created_at", { ascending: false });

    console.log(`[Blog Page] Posts query result: ${posts?.length || 0} posts, error: ${postsError?.message || 'none'}`);
    if (posts && posts.length > 0) {
        console.log(`[Blog Page] First post: id=${posts[0].id}, title=${posts[0].title}, status=${posts[0].status}`);
    }

    // Also check ALL contents for this lawyer to debug
    const { data: allContents } = await supabase
        .from("contents")
        .select("id, channel, status, title")
        .eq("lawyer_id", lawyer.id);
    console.log(`[Blog Page] All contents for lawyer: ${allContents?.length || 0}`);
    allContents?.forEach(c => console.log(`  - ${c.id}: channel=${c.channel}, status=${c.status}, title=${c.title?.substring(0, 30)}`));

    // Helper: strip markdown syntax for plain text excerpts
    function stripMarkdown(text: string): string {
        return text
            .replace(/^#{1,6}\s+/gm, "")     // ## headings
            .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
            .replace(/\*(.*?)\*/g, "$1")       // *italic*
            .replace(/\[(.*?)\]\(.*?\)/g, "$1") // [link](url)
            .replace(/[`~>]/g, "")            // backticks, blockquotes
            .replace(/^[-*]\s+/gm, "")        // list items
            .replace(/\n{2,}/g, " ")          // multiple newlines
            .replace(/\n/g, " ")              // single newlines
            .trim();
    }

    // Helper: parse post body (handles raw JSON or markdown)
    function parsePost(p: { id: string; title: string; body: string; meta_description: string | null; tags: string[] | null; channel: string; created_at: string; status: string }) {
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

        return { id: p.id, title, slug: p.id, excerpt, tags: p.tags || [], channel: p.channel, created_at: p.created_at };
    }

    return (
        <BlogPageClient
            lawyer={{
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
        />
    );
}
