import { Metadata } from "next";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import PostPageClient from "./PostPageClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; postSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, postSlug } = await params;
    const supabase = await createAdminClient();

    const { data: lawyer } = await supabase.from("lawyers").select("id, name").eq("slug", slug).single();
    if (!lawyer) return { title: "포스트를 찾을 수 없습니다" };

    const { data: post } = await supabase
        .from("contents")
        .select("title, meta_description, tags")
        .eq("lawyer_id", lawyer.id)
        .eq("id", postSlug)
        .single();

    if (!post) return { title: "포스트를 찾을 수 없습니다" };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const canonicalUrl = `${baseUrl}/blog/${slug}/${postSlug}`;

    return {
        title: `${post.title} | ${lawyer.name} 변호사`,
        description: post.meta_description || post.title,
        keywords: (post.tags || []).join(", "),
        alternates: {
            canonical: canonicalUrl,
        },
        robots: {
            index: true,
            follow: true,
        },
        openGraph: {
            title: post.title,
            description: post.meta_description || post.title,
            type: "article",
            url: canonicalUrl,
            authors: [lawyer.name],
            images: ["/og-image.png"],
        },
    };
}

export default async function PostPage({ params }: Props) {
    const { slug, postSlug } = await params;
    const supabase = await createAdminClient();

    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, name, slug, specialty, region, bio, brand_color, office_name, experience_years, profile_image_url, phone")
        .eq("slug", slug).single();

    if (!lawyer) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B7280]">블로그를 찾을 수 없습니다.</p></div>;
    }

    // Look up content by id (postSlug is the content id)
    const { data: post } = await supabase
        .from("contents")
        .select("*")
        .eq("lawyer_id", lawyer.id)
        .eq("id", postSlug)
        .eq("status", "published")
        .single();

    if (!post) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B7280]">포스트를 찾을 수 없습니다.</p></div>;
    }

    // Look up related instagram card news (same upload_id)
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

    // Check ownership — is the current logged-in user the author?
    let isOwner = false;
    try {
        const authSupabase = await createClient();
        const { data: { user } } = await authSupabase.auth.getUser();
        if (user) {
            const { data: currentLawyer } = await supabase
                .from("lawyers")
                .select("id")
                .eq("user_id", user.id)
                .single();
            if (currentLawyer && currentLawyer.id === lawyer.id) {
                isOwner = true;
            }
        }
    } catch { /* not logged in */ }

    // Parse JSON body if stored raw from AI
    let parsedTitle = post.title;
    let parsedBody = post.body || "";
    let parsedMeta = post.meta_description || "";
    if (parsedBody.trim().startsWith("```") || parsedBody.trim().startsWith("{")) {
        try {
            const cleanJson = parsedBody.replace(/^[\s]*```(?:json)?\s*\n?/, "").replace(/\n?\s*```[\s]*$/, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed.title) parsedTitle = parsed.title;
            if (parsed.body) parsedBody = parsed.body;
            if (parsed.meta_description && !parsedMeta) parsedMeta = parsed.meta_description;
        } catch { /* keep original */ }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    const canonicalUrl = `${baseUrl}/blog/${slug}/${postSlug}`;

    // Server-side JSON-LD: Article schema (Googlebot reads this without JS)
    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: parsedTitle,
        description: parsedMeta || parsedTitle,
        datePublished: post.created_at,
        dateModified: post.updated_at || post.created_at,
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

    return (
        <>
            {/* Server-rendered JSON-LD for Googlebot */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            {post.schema_markup && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            ...(post.schema_markup as object),
                        }),
                    }}
                />
            )}
            <PostPageClient
                lawyer={{ id: lawyer.id, name: lawyer.name, slug: lawyer.slug, specialty: lawyer.specialty || [], region: lawyer.region || "", bio: lawyer.bio || "", brand_color: lawyer.brand_color || "#3563AE", office_name: lawyer.office_name || "", experience_years: lawyer.experience_years || 0, profile_image_url: lawyer.profile_image_url || "", phone: lawyer.phone || null, website_url: (lawyer as Record<string, unknown>).website_url as string || null }}
                post={{ id: post.id, title: parsedTitle, slug: post.id, body: parsedBody, meta_description: parsedMeta, tags: post.tags || [], schema_markup: post.schema_markup, created_at: post.created_at, card_news_slides: cardNewsSlides.length > 0 ? cardNewsSlides : undefined, card_news_cover_image: cardNewsCoverImage }}
                isOwner={isOwner}
            />
        </>
    );
}
