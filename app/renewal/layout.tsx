import type { Metadata } from "next";
import "./renewal.css";
import SiteHeader from "@/components/renewal/SiteHeader";
import SiteFooter from "@/components/renewal/SiteFooter";

// ⚠️ robots 를 여기서 noindex 로 막지 말 것.
// noindex 를 달면 색인만 막히는 게 아니라 OpenAI 계열 크롤러가 본문 읽기를
// 거부한다(= ChatGPT "fetch 실패"). 데모 색인 차단은 robots.txt 에서
// 색인 봇만 Disallow 하는 방식으로 처리한다.
export const metadata: Metadata = {
    title: {
        default: "MAKETHIS1 — 로펌 마케팅 통합 운영",
        template: "%s | MAKETHIS1",
    },
};

export default function RenewalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-root min-h-screen flex flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />

            {/* 라이브와 헷갈리지 않도록. 교체 시 이 블록만 지우면 된다. */}
            <div
                className="fixed bottom-4 left-4 z-40 px-3 py-1.5 text-[10px] font-medium pointer-events-none select-none rounded-[2px]"
                style={{
                    background: "rgba(14,17,22,0.82)",
                    color: "#fff",
                    letterSpacing: "0.08em",
                }}
            >
                DEMO · NOINDEX
            </div>
        </div>
    );
}
