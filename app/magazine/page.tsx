import { createServiceClient } from "@/lib/supabase/server";
import MagazinePageClient from "./MagazinePageClient";

// 매거진 커버 이미지가 base64로 저장돼 ISR 정적 폴백이 비대해지는 문제로 동적 렌더 유지
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

/* ─── Types ─── */
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

export default async function MagazinePage() {
    const supabase = createServiceClient();

    const { data } = await supabase
        .from("magazines")
        .select("id, title, slug, excerpt, category, tags, cover_image_url, view_count, published_at, author")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60);

    const magazines: Magazine[] = data || [];

    const collectionJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "법률 마케팅 인사이트 매거진 | macdee insights",
        description: "변호사 광고, 로펌 마케팅, 법무법인 광고 트렌드와 전략을 다루는 macdee insights 매거진.",
        url: `${BASE_URL}/magazine`,
        publisher: {
            "@type": "Organization",
            name: "macdee",
            url: BASE_URL,
        },
        hasPart: magazines.map((m) => ({
            "@type": "Article",
            headline: m.title,
            description: m.excerpt,
            url: `${BASE_URL}/magazine/${m.slug}`,
            datePublished: m.published_at,
            author: { "@type": "Person", name: m.author || "macdee 에디터" },
            ...(m.cover_image_url ? { image: m.cover_image_url } : {}),
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
            />
            <MagazinePageClient magazines={magazines} />
        </>
    );
}
