import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { path, SITE_BASE } from "@/data/renewal/site";

export interface InsightItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    author: string | null;
    tags: string[] | null;
}

export const INSIGHTS_PAGE_SIZE = 18;

// The archive and service pages share one light, cached catalogue. Read in batches
// so Supabase's response limit never silently hides older published articles.
export const getInsightCatalogue = unstable_cache(async (): Promise<InsightItem[]> => {
    const supabase = createServiceClient();
    const articles: InsightItem[] = [];
    const batchSize = 200;
    for (let offset = 0; ; offset += batchSize) {
        const { data, error } = await supabase.from("magazines")
            .select("id, title, slug, excerpt, category, cover_image_url, published_at, author, tags")
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(offset, offset + batchSize - 1);
        if (error) throw new Error("매거진 목록을 불러오지 못했습니다.");
        articles.push(...(data || []));
        if (!data || data.length < batchSize) break;
    }
    return articles;
}, ["published-insights-catalogue"], { revalidate: 600, tags: ["magazines"] });

export function insightIndexHref(page = 1, category?: string | null): string {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (page > 1) query.set("page", String(page));
    const suffix = query.toString();
    return path(`/magazine${suffix ? `?${suffix}` : ""}`);
}

export function insightUrl(slug: string): string {
    return `${SITE_BASE}${path(`/magazine/${encodeURIComponent(slug)}`)}`;
}

export function insightAuthor(author: string | null) {
    const name = author?.trim() || "MAKETHIS1 편집팀";
    // A byline naming an editorial team or this company is not a person.
    const isOrganization = /에디터|편집|팀|macdee|makethis1|메이크디스원/i.test(name);
    return {
        "@type": isOrganization ? "Organization" : "Person",
        name,
        ...(isOrganization ? { url: `${SITE_BASE}${path("/about")}` } : {}),
    };
}

export function insightJsonLd(value: unknown): string {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

type Topic = { slug: string; label: string; terms: RegExp };
const TOPICS: Topic[] = [
    { slug: "lawfirm-marketing", label: "법무법인 통합 마케팅", terms: /법무법인\s*마케팅|로펌\s*마케팅|변호사\s*마케팅|법률\s*마케팅|브랜딩|마케팅\s*전략/gi },
    { slug: "naver-ads", label: "변호사 네이버·구글 광고 운영", terms: /네이버\s*광고|구글\s*광고|키워드\s*광고|검색\s*광고|파워링크|광고비|퍼포먼스|ROAS|CPC/gi },
    { slug: "lawfirm-seo", label: "로펌 SEO · 검색 최적화", terms: /\bSEO\b|검색\s*최적화|검색\s*노출|검색\s*순위|상위\s*노출|제로클릭/gi },
    { slug: "geo", label: "로펌 GEO · AI 검색 대응", terms: /\bGEO\b|\bAEO\b|AI\s*검색|AI\s*답변|AI\s*추천|AI가\s*추천|AI가\s*인용|생성형\s*검색|답변\s*엔진/gi },
    { slug: "lawfirm-blog", label: "변호사 블로그·콘텐츠 운영", terms: /블로그|콘텐츠|포스팅|법률\s*글|승소\s*사례/gi },
    { slug: "lawfirm-website", label: "법무법인 홈페이지 제작·운영", terms: /홈페이지|랜딩\s*페이지|웹사이트|로펌\s*사이트|변호사\s*사이트/gi },
    { slug: "conversion", label: "로펌 상담·수임 분석", terms: /전환율|상담\s*전환|상담\s*폼|응대\s*속도|인테이크|상담\s*전화|상담\s*경로|리드\s*관리|CPA/gi },
];

function topicScore(item: Pick<InsightItem, "title" | "tags" | "excerpt">, topic: Topic) {
    const occurrences = (value: string) => Math.min((value.match(topic.terms) || []).length, 3);
    return occurrences(item.title) * 6 + occurrences((item.tags || []).join(" ")) * 3
        + occurrences(item.excerpt || "");
}

// Reviewed introduction → blog outcomes → consultation conversion. These existing
// articles explain buying decisions without relying on expired pricing or forecasts.
const MARKETING_STARTER_SLUGS = ["125402348", "26243995", "13069827"];

export async function getRelatedInsights(serviceSlug: string, limit = 3): Promise<InsightItem[]> {
    const topic = TOPICS.find((entry) => entry.slug === serviceSlug);
    if (!topic) return [];
    try {
        const catalogue = await getInsightCatalogue();
        const featured = serviceSlug === "lawfirm-marketing"
            ? MARKETING_STARTER_SLUGS.flatMap(slug => catalogue.filter(item => item.slug === slug))
            : [];
        const ranked = catalogue
            .map((item) => ({ item, score: topicScore(item, topic) }))
            .filter(({ item, score }) => score > 0 && !featured.some(article => article.slug === item.slug))
            .sort((a, b) => b.score - a.score)
            .map(({ item }) => item);
        return [...featured, ...ranked].slice(0, limit);
    } catch {
        return [];
    }
}

export function getInsightServices(item: Pick<InsightItem, "title" | "tags" | "excerpt">) {
    return TOPICS.filter((topic) => topic.slug !== "lawfirm-marketing")
        .map((topic) => ({ ...topic, score: topicScore(item, topic) }))
        .filter(({ score }) => score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ slug, label }) => ({ href: path(`/${slug}`), label }));
}
