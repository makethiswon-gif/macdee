import type { Metadata } from "next";
import { getInsightCatalogue } from "@/lib/renewal/magazine";

import HomeScroll from "@/components/renewal/home/scroll/HomeScroll";

import { COMPANY, FOUNDER, absUrl, ogImage } from "@/data/renewal/site";
import { renewalRobots } from "./flags";

export const revalidate = 600;

const URL = absUrl("/");
const TITLE = "법무법인 마케팅 · 변호사 광고 | 메이크디스원 MAKETHIS1";
const DESCRIPTION =
    "법무법인·법률사무소를 위한 통합 마케팅. 변호사 블로그, 네이버·구글 광고, SEO·AI 검색, 홈페이지와 상담 분석까지 메이크디스원이 운영합니다. 서비스 범위와 월 운영비를 확인하세요.";

// 루트 레이아웃의 title 템플릿(macdee)이 붙지 않도록 absolute 로 고정한다.
export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: URL,
        type: "website",
        locale: "ko_KR",
        siteName: COMPANY.brand,
        images: [ogImage()],
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// 공개 홈에서 사이트와 회사를 선언한다. 하위 서비스·매거진은 같은 @id를 참조한다.
//
// ⚠️ 검증되지 않은 정보를 넣지 않는다.
//    사업자등록번호·설립연도·수상 이력처럼 확인하지 못한 값은 비워둔다.
//    전화·주소는 기존 홈에 이미 공개돼 있던 값이다.
const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": `${URL}#website`,
            url: URL,
            name: COMPANY.brand,
            alternateName: [COMPANY.legalName, "makethis1"],
            description: DESCRIPTION,
            inLanguage: "ko-KR",
            publisher: { "@id": `${URL}#organization` },
        },
        {
            "@type": ["Organization", "ProfessionalService"],
            "@id": `${URL}#organization`,
            name: COMPANY.brand,
            legalName: COMPANY.legalName,
            alternateName: ["메이크디스원", "macdee", "맥디"],
            url: COMPANY.site,
            description:
                "법무법인·법률사무소의 마케팅을 통합 운영하는 메이크디스원. 변호사 광고·검색·콘텐츠·홈페이지·상담 분석을 함께 관리합니다.",
            founder: {
                "@type": "Person",
                name: FOUNDER.name,
                jobTitle: FOUNDER.role,
            },
            // foundingDate 는 넣지 않는다.
            // 기존 자산에 세 값이 서로 다르게 남아 있다 —
            // 루트 레이아웃 2019 / makethisone 스키마 2023 / 공표 수치 "업력 7년+".
            // 어느 쪽이 맞는지 확인되기 전에는 쓰지 않는다.
            areaServed: { "@type": "Country", name: "KR" },
            knowsAbout: [
                "로펌 마케팅",
                "법무법인 마케팅",
                "변호사 광고",
                "법무법인 광고",
                "네이버 파워링크",
                "Google Ads",
                "로펌 SEO",
                "AI 검색 대응",
                "변호사 블로그 마케팅",
                "변호사 홈페이지 제작",
                "상담 전환 분석",
            ],
            contactPoint: {
                "@type": "ContactPoint",
                telephone: "+82-10-8935-3010",
                contactType: "sales",
                availableLanguage: "Korean",
            },
            address: {
                "@type": "PostalAddress",
                addressCountry: "KR",
                addressRegion: "서울특별시",
                addressLocality: "동대문구",
                streetAddress: "왕산로5길 13",
            },
        },
        {
            "@type": "WebPage",
            "@id": `${URL}#webpage`,
            url: URL,
            name: TITLE,
            description: DESCRIPTION,
            inLanguage: "ko-KR",
            isPartOf: { "@id": `${URL}#website` },
            about: { "@id": `${URL}#organization` },
        },
    ],
};

export default async function RenewalHome() {
    // Catalogue is already ordered by publication date (newest first).
    // Homepage shows the latest three; service pages retain their related picks.
    const catalogue = await getInsightCatalogue().catch(() => []);
    const insights = catalogue.slice(0, 3);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* 스크롤 홈(2026-11-15 대표 선택): 3D '1' 이 화면에 붙어 스크롤에 따라 돌고,
                판 색이 파랑↔흰색으로 뒤집힌다. 구역: 첫 화면 → 하나로 → 워크플로우 → 기록 → 구조(#system)
                → 함께한 이름 → 사람 → 비용(#plans)·FAQ → 매거진 → 문의.
                이전 홈(edition/*)은 지우지 않았다 — 되돌릴 때는 이 자리에 다시 끼우면 된다. */}
            <HomeScroll insights={insights} total={catalogue.length} />
        </>
    );
}
