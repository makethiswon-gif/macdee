import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { Container, Eyebrow } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import InsightsIndex, { type InsightListItem } from "@/components/renewal/InsightsIndex";
import { COMPANY, ogImage } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

// INSIGHTS 리스킨 (Phase 8).
// URL 정책: 실제 URL 은 /magazine 그대로, UI 라벨만 INSIGHTS (계획서 §3.1).
// 이 디렉터리는 교체 시 app/magazine 으로 이동해 기존 목록을 대체한다.
export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

// canonical 은 데모 경로가 아니라 최종 URL(/magazine)을 가리킨다.
// 지금은 라이브와 내용이 겹치는 데모를 라이브로 정규화해 중복 색인을 막고,
// 교체 후에는 그대로 자기 자신이 된다 — 옮길 때 손댈 것이 없다.
const CANONICAL = `${BASE_URL}/magazine`;
const TITLE = "법률 마케팅 인사이트 | MAKETHIS1 Insights";
const DESCRIPTION =
    "변호사 광고, 로펌 마케팅, 법무법인 광고 트렌드와 전략을 다루는 MAKETHIS1 Insights. " +
    "법률 마케팅 전문가가 직접 쓰는 시장 분석과 트렌드 리포트.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: CANONICAL },
    robots: renewalRobots(),
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: CANONICAL,
        type: "website",
        locale: "ko_KR",
        siteName: COMPANY.brand,
        images: [ogImage()],
    },
};

export default async function InsightsPage() {
    let magazines: InsightListItem[] = [];
    try {
        const supabase = createServiceClient();
        const { data } = await supabase
            .from("magazines")
            .select("id, title, slug, excerpt, category, cover_image_url, published_at, author")
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(60);
        magazines = data || [];
    } catch {
        // DB가 안 붙어도 페이지는 떠야 한다.
        magazines = [];
    }

    const collectionJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: CANONICAL,
        publisher: { "@type": "Organization", name: COMPANY.brand, url: BASE_URL },
        hasPart: magazines.map((m) => ({
            "@type": "Article",
            headline: m.title,
            ...(m.excerpt ? { description: m.excerpt } : {}),
            url: `${BASE_URL}/magazine/${m.slug}`,
            ...(m.published_at ? { datePublished: m.published_at } : {}),
            author: { "@type": "Person", name: m.author || "MAKETHIS1 편집팀" },
            ...(m.cover_image_url ? { image: m.cover_image_url } : {}),
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
            />

            {/* 헤더가 fixed 라 첫 섹션이 직접 상단 여백을 진다 */}
            <section className="pt-[152px] md:pt-[190px] pb-[88px] md:pb-[140px]">
                <Container>
                    <div className="max-w-[820px]">
                        <Eyebrow className="mt-hero-in">Insights</Eyebrow>
                        <h1 className="mt-h1 mt-6 mt-hero-in" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                            법률 마케팅이 어떻게 움직이는지
                            <br />
                            계속 기록합니다.
                        </h1>
                        <p
                            className="mt-body-lg mt-7 max-w-[560px] mt-hero-in"
                            style={{ ["--mt-hero-delay" as string]: "120ms" }}
                        >
                            검색과 광고, AI가 바꾸는 법률 시장을 MAKETHIS1 편집팀이 직접 씁니다.
                            기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다.
                        </p>
                    </div>

                    <Reveal variant="rise" className="mt-14 md:mt-20">
                        <InsightsIndex items={magazines} />
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
