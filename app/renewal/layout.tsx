import type { Metadata } from "next";
import "./renewal.css";
import SiteHeader from "@/components/renewal/SiteHeader";
import SiteFooter from "@/components/renewal/SiteFooter";
import { renewalRobots, DEMO_BADGE } from "./flags";

// robots 는 flags.ts 한 곳에서만 켠다. 이유는 그 파일 주석 참고.
export const metadata: Metadata = {
    robots: renewalRobots(),
    // 루트 레이아웃의 keywords 는 macdee 기준이다(변호사 광고 자동화, 맥디…).
    // 상속을 끊지 않으면 리뉴얼 전 페이지에 macdee 키워드가 그대로 붙는다.
    keywords: [
        "로펌 마케팅",
        "변호사 광고",
        "법무법인 광고",
        "변호사 네이버 광고",
        "로펌 SEO",
        "변호사 홈페이지 제작",
        "변호사 블로그 마케팅",
        "로펌 AI 검색",
        "상담 전환 분석",
        "MAKETHIS1",
        "메이크디스원",
    ],
    title: {
        default: "MAKETHIS1 — 로펌 마케팅 통합 운영",
        template: "%s | MAKETHIS1",
    },
};

// 파싱 도중 동기 실행돼 html 에 mt-js 를 붙인다.
// 이게 붙어야만 스크롤 리빌의 숨김 상태가 적용된다(renewal.css 참고).
// JS가 없는 환경에서는 붙지 않으므로 본문이 그냥 다 보인다 —
// 렌더링 방식 크롤러와 JS 끈 방문자에게 빈 화면이 나가는 것을 막는다.
const JS_MARKER = "document.documentElement.classList.add('mt-js')";

export default function RenewalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-root min-h-screen flex flex-col">
            <script dangerouslySetInnerHTML={{ __html: JS_MARKER }} />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />

            {/* 라이브와 헷갈리지 않도록. 배지는 실제 색인 상태를 그대로 쓴다.
                교체 시 이 블록만 지우면 된다. */}
            <div
                className="fixed bottom-4 left-4 z-40 px-3 py-1.5 text-[10px] font-medium pointer-events-none select-none rounded-[2px]"
                style={{
                    background: "rgba(14,17,22,0.82)",
                    color: "#fff",
                    letterSpacing: "0.08em",
                }}
            >
                {DEMO_BADGE}
            </div>
        </div>
    );
}
