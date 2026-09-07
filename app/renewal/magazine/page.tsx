import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Eyebrow } from "@/components/renewal/primitives";
import InsightsIndex from "@/components/renewal/InsightsIndex";
import { COMPANY, SITE_BASE, ogImage, path } from "@/data/renewal/site";
import { getInsightCatalogue, INSIGHTS_PAGE_SIZE, insightIndexHref, insightJsonLd, insightUrl } from "@/lib/renewal/magazine";

export const revalidate = 600;

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
const TITLE = "법무법인 마케팅·변호사 광고 인사이트 | 메이크디스원";
const DESCRIPTION = "법무법인 마케팅, 변호사 블로그, 네이버·구글 광고, SEO와 AI 검색을 다루는 메이크디스원 매거진. 로펌 운영에 필요한 전략과 칼럼을 주제별로 읽어보세요.";

function readQuery(params: Record<string, string | string[] | undefined>) {
    const rawPage = params.page;
    const rawCategory = params.category;
    if (Array.isArray(rawPage) || Array.isArray(rawCategory)) notFound();
    if (rawPage && !/^[1-9]\d*$/.test(rawPage)) notFound();
    const page = rawPage ? Number(rawPage) : 1;
    if (!Number.isSafeInteger(page)) notFound();
    return { page, category: rawCategory?.trim() || null };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const { page, category } = readQuery(searchParams ? await searchParams : {});
    const title = category ? `${category} 인사이트${page > 1 ? ` · ${page}페이지` : ""} | 메이크디스원` : page > 1 ? `법무법인 마케팅 인사이트 · ${page}페이지 | 메이크디스원` : TITLE;
    const canonical = `${SITE_BASE}${insightIndexHref(page, category)}`;
    return {
        title: { absolute: title },
        description: DESCRIPTION,
        alternates: { canonical },
        robots: { index: true, follow: true },
        openGraph: { title, description: DESCRIPTION, url: canonical, type: "website", locale: "ko_KR", siteName: COMPANY.brand, images: [ogImage()] },
    };
}

export default async function InsightsPage({ searchParams }: PageProps) {
    const { page, category } = readQuery(searchParams ? await searchParams : {});
    const catalogue = await getInsightCatalogue();
    const categoryCounts = new Map<string, number>();
    for (const item of catalogue) {
        if (item.category) categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
    }
    const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (category && !categoryCounts.has(category)) notFound();
    const filtered = category ? catalogue.filter((item) => item.category === category) : catalogue;
    const totalPages = Math.max(1, Math.ceil(filtered.length / INSIGHTS_PAGE_SIZE));
    if (page > totalPages) notFound();
    const magazines = filtered.slice((page - 1) * INSIGHTS_PAGE_SIZE, page * INSIGHTS_PAGE_SIZE);
    const canonical = `${SITE_BASE}${insightIndexHref(page, category)}`;
    const collectionJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category ? `${category} 인사이트 · ${page}페이지` : `법무법인 마케팅 인사이트 · ${page}페이지`,
        description: DESCRIPTION,
        url: canonical,
        inLanguage: "ko-KR",
        publisher: { "@type": "Organization", name: COMPANY.brand, url: SITE_BASE },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: magazines.length,
            itemListElement: magazines.map((item, i) => ({
                "@type": "ListItem", position: (page - 1) * INSIGHTS_PAGE_SIZE + i + 1,
                name: item.title, url: insightUrl(item.slug),
            })),
        },
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: insightJsonLd(collectionJsonLd) }} />
            <section className="mt-k-masthead" data-page="magazine">
                <Container>
                    <div className="max-w-[820px]">
                        <Eyebrow className="mt-hero-in">Insights</Eyebrow>
                        <h1 className="mt-h1 mt-6 mt-hero-in" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                            {category ? <>{category},<br />지금 알아둘 것.</> : <>로펌 마케팅,<br />지금 알아둘 것.</>}
                        </h1>
                        <p className="mt-body-lg mt-7 max-w-[560px] mt-hero-in" style={{ ["--mt-hero-delay" as string]: "120ms" }}>
                            법무법인 마케팅과 변호사 광고.<br />검색·블로그·AI의 변화를 쉽게 전합니다.
                        </p>
                        <Link href={path("/lawfirm-marketing")} className="mt-7 inline-block text-[14px] underline underline-offset-4">법무법인 통합 마케팅 서비스 →</Link>
                    </div>
                </Container>
            </section>
            <section className="mt-section mt-k-insights">
                <Container>
                    <InsightsIndex items={magazines} categories={categories} active={category} total={catalogue.length} page={page} totalPages={totalPages} />
                </Container>
            </section>
        </>
    );
}
