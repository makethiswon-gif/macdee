import type { Metadata } from "next";
import { getInsightCatalogue, getRelatedInsights } from "@/lib/renewal/magazine";

import HeroSection from "@/components/renewal/home/HeroSection";
import ClientJourney from "@/components/renewal/home/ClientJourney";
import ProblemSection from "@/components/renewal/home/ProblemSection";
import PartnerLogos from "@/components/renewal/home/PartnerLogos";
import ServicesSection from "@/components/renewal/home/ServicesSection";
import InvariantClause from "@/components/renewal/home/InvariantClause";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import WhyMakethis1 from "@/components/renewal/home/WhyMakethis1";
import InsightsPreview from "@/components/renewal/home/InsightsPreview";
import PlansSection from "@/components/renewal/home/PlansSection";
import FinalCTA from "@/components/renewal/home/FinalCTA";

import { CASES } from "@/data/renewal/cases";
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
    // 날짜만으로 고르지 않고, 기존 발행글 중 로펌 마케팅과 관련 있는 글을 연결한다.
    const [catalogue, insights] = await Promise.all([
        getInsightCatalogue().catch(() => []), getRelatedInsights("lawfirm-marketing", 3),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* "필요한 전부, 한 팀" 구조 (대표 지시 2026-08-29 — 계약서 은유 폐기).
                Hero(선언 + 맡는 일 카드 + 검증 수치) → 서비스 범위 01~06
                → 의뢰인 여정 3단계 → 맡기기 전/후 → 증거(파트너) → 사례
                → 새 채널 대응(축소) → 팀 → Insights → 세 가지 운영안(#plans) → CTA

                핵심 원칙: 첫 화면 5초 안에 "필요한 마케팅 전부를 한 팀이 운영해
                간단해진다"가 읽혀야 한다. 효과 없이 읽어도 구조가 이해된다. */}
            <HeroSection />
            <ServicesSection />
            <ClientJourney />
            <ProblemSection />
            <PartnerLogos />
            {/* 홈은 첫 사례만 Growth Path 를 펼친다 — 전체는 /work */}
            <CaseStudies cases={CASES} growthLimit={1} />
            <InvariantClause />
            <WhyMakethis1 />
            <InsightsPreview items={insights} total={catalogue.length} />
            <PlansSection />
            <FinalCTA />
        </>
    );
}
