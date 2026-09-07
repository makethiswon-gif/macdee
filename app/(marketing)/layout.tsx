import type { Metadata } from "next";
import "@/app/renewal/renewal.css";
import "@/app/renewal/kinetic.css";
import StudyFont from "@/components/renewal/concepts/StudyFont";
import SiteHeader from "@/components/renewal/SiteHeader";
import SiteFooter from "@/components/renewal/SiteFooter";

// 마케팅 표면에만 적용. 관리자·제품·포털은 이 레이아웃을 상속하지 않는다.
export const metadata: Metadata = {
    title: { default: "MAKETHIS1 — 로펌 마케팅 통합 운영", template: "%s | MAKETHIS1" },
    keywords: ["로펌 마케팅", "변호사 광고", "법무법인 광고", "변호사 네이버 광고", "로펌 SEO", "변호사 홈페이지 제작", "변호사 블로그 마케팅", "로펌 AI 검색", "상담 전환 분석", "MAKETHIS1", "메이크디스원"],
    robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div data-marketing className="mt-root min-h-screen flex flex-col">
            <StudyFont />
            <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('mt-js')" }} />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}
