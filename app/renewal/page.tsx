import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";

import HeroSection from "@/components/renewal/home/HeroSection";
import ProblemSection from "@/components/renewal/home/ProblemSection";
import MarketingSystem from "@/components/renewal/home/MarketingSystem";
import ChannelGrid from "@/components/renewal/home/ChannelGrid";
import FutureReady from "@/components/renewal/home/FutureReady";
import WhyMakethis1 from "@/components/renewal/home/WhyMakethis1";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import PartnerLogos from "@/components/renewal/home/PartnerLogos";
import InsightsPreview, { type InsightItem } from "@/components/renewal/home/InsightsPreview";
import FinalCTA from "@/components/renewal/home/FinalCTA";

import { CASES, SAMPLE_CASES } from "@/data/renewal/cases";

export const revalidate = 600;

const DEMO_URL = "https://www.makethis1.com/renewal";

const DESCRIPTION =
    "네이버 파워링크부터 Google Ads, 네이버 블로그와 홈페이지, SEO·GEO, AI 검색과 " +
    "상담 전환 분석까지. MAKETHIS1이 로펌의 마케팅팀처럼 전체 마케팅을 통합 운영합니다.";

// 루트 레이아웃의 title 템플릿(macdee)이 붙지 않도록 absolute 로 고정한다.
// robots 는 지정하지 않는다 — 외부 크롤러가 본문을 읽을 수 있어야 한다.
export const metadata: Metadata = {
    title: { absolute: "로펌 마케팅, 여기서 끝냅니다 | MAKETHIS1" },
    description: DESCRIPTION,
    alternates: { canonical: DEMO_URL },
    openGraph: {
        title: "로펌 마케팅, 여기서 끝냅니다 | MAKETHIS1",
        description: DESCRIPTION,
        url: DEMO_URL,
        type: "website",
        locale: "ko_KR",
    },
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

    // 실데이터가 있으면 실데이터, 없으면 샘플(경고 배너 강제 노출).
    const cases = CASES.length ? CASES : SAMPLE_CASES;

    return (
        <>
            <HeroSection />
            <ProblemSection />
            <MarketingSystem />
            <ChannelGrid />
            <FutureReady />
            <WhyMakethis1 />
            <CaseStudies cases={cases} />
            <InsightsPreview items={insights} />
            <PartnerLogos />
            <FinalCTA />
        </>
    );
}
