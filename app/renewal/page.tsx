import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";

import HeroSection from "@/components/renewal/home/HeroSection";
import ProblemSection from "@/components/renewal/home/ProblemSection";
import PartnerLogos from "@/components/renewal/home/PartnerLogos";
import ContractScope from "@/components/renewal/home/ContractScope";
import InvariantClause from "@/components/renewal/home/InvariantClause";
import MarketingSystem from "@/components/renewal/home/MarketingSystem";
import LeadToCase from "@/components/renewal/home/LeadToCase";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import HowWeOperate from "@/components/renewal/home/HowWeOperate";
import WhyMakethis1 from "@/components/renewal/home/WhyMakethis1";
import InsightsPreview, { type InsightItem } from "@/components/renewal/home/InsightsPreview";
import FinalCTA from "@/components/renewal/home/FinalCTA";

import { CASES } from "@/data/renewal/cases";
import { COMPANY, FOUNDER, absUrl, ogImage } from "@/data/renewal/site";
import { renewalRobots } from "./flags";

export const revalidate = 600;

const URL = absUrl("/");
const TITLE = "로펌 마케팅, 여기서 끝냅니다 | MAKETHIS1";
const DESCRIPTION =
    "네이버 파워링크부터 Google Ads, 네이버 블로그와 홈페이지, SEO·GEO, AI 검색과 " +
    "상담 전환 분석까지. 로펌에 필요한 마케팅은 MAKETHIS1이 전부 해결합니다.";

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

// 루트 레이아웃은 macdee 기준의 WebSite·Organization 을 전역 삽입한다.
// 리뉴얼 route 에서는 MAKETHIS1 기준으로 다시 선언한다.
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
            url: COMPANY.site,
            description:
                "변호사와 법무법인만 상대하는 마케팅 회사. 검색광고, SEO, AI 검색 대응, 콘텐츠, 홈페이지, 상담 전환 분석을 하나의 팀이 통합 운영합니다.",
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
    // 실제 매거진을 그대로 읽는다. 데모라고 가짜 글을 만들지 않는다.
    let insights: InsightItem[] = [];
    try {
        const supabase = createServiceClient();
        const { data } = await supabase
            .from("magazines")
            .select("id, title, slug, excerpt, category, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(3);
        insights = data || [];
    } catch {
        // DB가 안 붙어도 데모 화면은 떠야 한다. 섹션만 조용히 빠진다.
        insights = [];
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* The Contract — 조(條) 구조 (docs/HOME_REDESIGN_PLAN.md).
                Hero(선언) → 제1조 문제(수렴) → 증거(파트너) → 제2조 계약 범위(별지)
                → 제3조 변해도 조항(장부) → 제4조 운영(6단계) → 제5조 성과(데이터 흐름)
                → 첨부 1~3(사례·운영 체계·팀) → Insights → 서명란

                강한 인터랙션은 세 곳뿐이다(§18) — 제1조 수렴 / 제3조 변해도 시퀀스 /
                제5조 데이터 흐름. 나머지는 작은 reveal 과 hover 만 쓴다.

                Case Study 는 확인된 수치가 있는 사례만 넣는다. CASES 가 비어 있으면
                섹션 자체가 사라진다. 샘플을 홈에 노출하지 않는다. */}
            <HeroSection />
            <ProblemSection />
            <PartnerLogos />
            <ContractScope />
            <InvariantClause />
            <MarketingSystem />
            <LeadToCase />
            <CaseStudies cases={CASES} />
            <HowWeOperate />
            <WhyMakethis1 />
            <InsightsPreview items={insights} />
            <FinalCTA />
        </>
    );
}
