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

// SEO-critical content rendered server-side for Googlebot
// All interactive/animated UI is in HomePageClient
export default function Home() {
    return <HomePageClient />;
}
