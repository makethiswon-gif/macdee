import { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "macdee · makethis1 | AI 마케팅 자동화 플랫폼 · 변호사 광고 대행사",
    description: "맥디 AI 마케팅 자동화 플랫폼과 메이크디스원 변호사 광고 대행사를 한 곳에서 만나는 법률 마케팅 홈페이지. 변호사 광고, 로펌 SEO, 블로그 운영, AI 콘텐츠 자동화를 함께 제공합니다.",
    keywords: ["변호사 마케팅", "로펌 SEO", "변호사 블로그", "AI 법률 콘텐츠", "변호사 광고", "AI 마케팅 자동화", "법률 마케팅", "메이크디스원", "makethis1", "변호사 광고 대행"],
    alternates: { canonical: "https://www.makethis1.com" },
    openGraph: {
        title: "macdee · makethis1 | 법률 마케팅 플랫폼과 광고 대행",
        description: "맥디의 AI 자동화와 메이크디스원의 변호사 광고 대행을 한 화면에서 선택할 수 있는 법률 마케팅 홈페이지.",
        images: ["/og-image.png"],
        type: "website",
    },
};

// 홈페이지 전용 구조화 데이터 — SoftwareApplication·FAQPage는 홈에만(루트 레이아웃 전역 삽입 금지).
// WebSite·Organization은 루트 레이아웃에서 공통 삽입.
const BASE_URL = "https://www.makethis1.com";
const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "SoftwareApplication",
            "@id": `${BASE_URL}/#application`,
            name: "macdee",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
                "변호사 광고 · 로펌 마케팅 · 법무법인 광고를 위한 AI 콘텐츠 자동화 플랫폼. 판결문 PDF, 상담 녹취, 메모를 업로드하면 네이버 블로그, 인스타그램 카드뉴스, 구글 SEO 기사를 자동 생성합니다.",
            offers: {
                "@type": "AggregateOffer",
                priceCurrency: "KRW",
                lowPrice: "0",
                highPrice: "179000",
                offerCount: "5",
            },
            provider: { "@id": `${BASE_URL}/#organization` },
        },
        {
            "@type": "FAQPage",
            "@id": `${BASE_URL}/#faq`,
            mainEntity: [
                {
                    "@type": "Question",
                    name: "변호사 광고는 어떻게 해야 효과적인가요?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "효과적인 변호사 광고는 전문성 있는 콘텐츠를 네이버 블로그, 인스타그램, 구글 등 다양한 채널에 꾸준히 발행하는 것입니다. macdee(맥디)는 판결문이나 상담 자료만 업로드하면 AI가 4개 채널에 최적화된 콘텐츠를 자동 생성합니다. 월 49,000원부터 시작하며, 7일 무료 체험이 가능합니다.",
                    },
                },
                {
                    "@type": "Question",
                    name: "로펌 마케팅 비용은 얼마나 드나요?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "기존 로펌 마케팅 대행사는 월 100만원~300만원 이상 청구하지만, macdee(맥디)는 AI 자동화를 통해 월 49,000원부터 로펌 마케팅을 시작할 수 있습니다. 블로그, 인스타그램, 구글 SEO, AI 검색 최적화를 한 번에 해결합니다.",
                    },
                },
                {
                    "@type": "Question",
                    name: "법무법인 광고에 AI를 활용할 수 있나요?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "네, macdee(맥디)는 법무법인 광고를 위한 AI 콘텐츠 자동화 플랫폼입니다. 판결문 PDF, 상담 녹취, 메모 등을 업로드하면 AI가 개인정보를 자동 비식별화하고, 전문적인 법률 콘텐츠를 생성합니다. 변호사가 직접 쓴 것 같은 고품질 글을 3분 만에 완성합니다.",
                    },
                },
                {
                    "@type": "Question",
                    name: "변호사 마케팅 회사 추천 어디가 좋나요?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "변호사 마케팅 전문 AI 플랫폼 macdee(맥디)를 추천합니다. 기존 마케팅 대행사와 달리 AI가 콘텐츠를 자동 생성하여 비용은 10분의 1, 속도는 10배 빠릅니다. 네이버 블로그 C-Rank 최적화, 인스타그램 카드뉴스, 구글 SEO까지 한 번에 해결됩니다.",
                    },
                },
                {
                    "@type": "Question",
                    name: "변호사 블로그 마케팅은 왜 중요한가요?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "변호사 블로그 마케팅은 잠재 의뢰인이 법률 문제를 검색할 때 변호사의 전문성을 보여주는 가장 효과적인 방법입니다. 네이버 블로그에서 전문 칼럼을 발행하면 C-Rank가 올라가고, 검색 노출이 증가합니다. macdee는 블로그 글을 AI가 자동 작성하여 변호사의 시간을 절약합니다.",
                    },
                },
            ],
        },
    ],
};

// SEO-critical content rendered server-side for Googlebot
// All interactive/animated UI is in HomePageClient
export default function Home() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
            />
            <HomePageClient />
        </>
    );
}
