import type { Metadata } from "next";
import "./renewal.css";
import SiteHeader from "@/components/renewal/SiteHeader";
import SiteFooter from "@/components/renewal/SiteFooter";

// ⚠️ 데모 구간 — 절대 색인되면 안 된다(RENEWAL_PLAN §6.1, R1).
// 3중 차단 중 2번째: 페이지 메타. (1번은 middleware의 X-Robots-Tag,
// 3번은 sitemap 미등록.)
export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
    title: {
        default: "MAKETHIS1 리뉴얼 데모",
        template: "%s | MAKETHIS1 데모",
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
