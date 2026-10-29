import type { Metadata, Viewport } from "next";
import "@/app/product-fonts.css";

// 딥마카이 광고 수익 배분 약정 — 링크를 받은 당사자만. 색인 금지(메타 + middleware X-Robots-Tag), 사이트맵·내부 링크에 넣지 않는다.
export const metadata: Metadata = {
    title: { absolute: "딥마카이 광고 수익 배분 약정서" },
    description: "딥마카이 광고 수익 배분 전자 약정",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#F4F4F2", width: "device-width", initialScale: 1 };

export default function RevenueShareLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-dvh bg-[#F4F4F2] text-[#16171A]">{children}</div>;
}
