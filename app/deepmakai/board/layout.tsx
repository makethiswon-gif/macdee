import type { Metadata, Viewport } from "next";
import "@/app/product-fonts.css";

// 딥마카이 계약 링크 모음 — 비밀 주소를 아는 대표만. 색인 금지(메타 + middleware X-Robots-Tag), 사이트맵·내부 링크에 넣지 않는다.
export const metadata: Metadata = {
    title: { absolute: "딥마카이 계약 링크" },
    description: "딥마카이 계약 서명 링크 모음",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#F4F4F2", width: "device-width", initialScale: 1 };

export default function DeepmakaiBoardLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-dvh bg-[#F4F4F2] text-[#16171A]">{children}</div>;
}
