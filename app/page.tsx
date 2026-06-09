import { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "macdee | 변호사를 위한 AI 마케팅 자동화 플랫폼",
    description: "네이버 블로그 글을 ChatGPT·Perplexity·Gemini 등 AI가 구글·AI 검색에 최적화된 콘텐츠로 자동 변환. 변호사 전문 마케팅 플랫폼.",
    keywords: ["변호사 마케팅", "로펌 SEO", "변호사 블로그", "AI 법률 콘텐츠", "변호사 광고", "AI 마케팅 자동화", "법률 마케팅"],
    alternates: { canonical: "https://www.makethis1.com" },
    openGraph: {
        title: "macdee | 변호사 AI 마케팅 자동화",
        description: "변호사 블로그를 AI가 자동 최적화. Google·ChatGPT·Perplexity 검색 상위 노출.",
        images: ["/og-image.png"],
        type: "website",
    },
};

// SEO-critical content rendered server-side for Googlebot
// All interactive/animated UI is in HomePageClient
export default function Home() {
    return <HomePageClient />;
}
