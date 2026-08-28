import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";

import HeroSection from "@/components/renewal/home/HeroSection";
import GlobalThread from "@/components/renewal/home/GlobalThread";
import ClientJourney from "@/components/renewal/home/ClientJourney";
import ProblemSection from "@/components/renewal/home/ProblemSection";
import PartnerLogos from "@/components/renewal/home/PartnerLogos";
import ServicesSection from "@/components/renewal/home/ServicesSection";
import InvariantClause from "@/components/renewal/home/InvariantClause";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import WhyMakethis1 from "@/components/renewal/home/WhyMakethis1";
import InsightsPreview, { type InsightItem } from "@/components/renewal/home/InsightsPreview";
import PlansSection from "@/components/renewal/home/PlansSection";
import FinalCTA from "@/components/renewal/home/FinalCTA";

import { CASES } from "@/data/renewal/cases";
import { COMPANY, FOUNDER, absUrl, ogImage } from "@/data/renewal/site";
import { renewalRobots } from "./flags";

export const revalidate = 600;

const URL = absUrl("/");
const TITLE = "로펌 마케팅에 필요한 모든 것 | MAKETHIS1";
const DESCRIPTION =
    "검색광고, 블로그, SEO, AI 검색, 홈페이지, 상담 분석까지. " +
    "여러 업체를 따로 찾고 관리할 필요 없이 메이크디스원 한 팀이 전부 운영합니다.";

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
    let insightsTotal = 0;
    try {
        const supabase = createServiceClient();
        const { data, count } = await supabase
            .from("magazines")
            .select("id, title, slug, excerpt, category, published_at", { count: "exact" })
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(3);
        insights = data || [];
        insightsTotal = count ?? 0;
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

            {/* "필요한 전부, 한 팀" 구조 (대표 지시 2026-08-29 — 계약서 은유 폐기).
                Hero(선언 + 맡는 일 카드 + 검증 수치) → 서비스 범위 01~06
                → 의뢰인 여정 3단계 → 맡기기 전/후 → 증거(파트너) → 사례
                → 새 채널 대응(축소) → 팀 → Insights → 세 가지 운영안(#plans) → CTA

                핵심 원칙: 첫 화면 5초 안에 "필요한 마케팅 전부를 한 팀이 운영해
                간단해진다"가 읽혀야 한다. 효과 없이 읽어도 구조가 이해된다. */}
            <GlobalThread />
            <HeroSection />
            <ServicesSection />
            <ClientJourney />
            <ProblemSection />
            <PartnerLogos />
            <CaseStudies cases={CASES} />
            <InvariantClause />
            <WhyMakethis1 />
            <InsightsPreview items={insights} total={insightsTotal} />
            <PlansSection />
            <FinalCTA />
        </>
    );
}
