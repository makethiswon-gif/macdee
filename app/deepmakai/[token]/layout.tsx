import type { Metadata, Viewport } from "next";
import "@/app/product-fonts.css";
import "@fontsource/do-hyeon";
import "@fontsource/black-ops-one";
import "../crew.css";

// 딥마카이 크루룸 — 주소를 아는 사람만. 색인 금지(메타 + middleware X-Robots-Tag), 사이트맵·내부 링크에 넣지 않는다.
export const metadata: Metadata = {
    title: { absolute: "딥마카이 크루룸" },
    description: "딥마카이 제작진과 진행자의 비공개 소통 보드",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
};

export const viewport: Viewport = {
    themeColor: "#1F2C4D",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
    return <div className="dm-root">{children}</div>;
}
