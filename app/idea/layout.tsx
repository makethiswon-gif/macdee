import type { Metadata, Viewport } from "next";
import "@/app/product-fonts.css";
import "@fontsource/noto-serif-kr/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./idea.css";

// OYK POST 아이디어 창고 — 대표 개인용. 색인 금지(메타 + middleware X-Robots-Tag), 사이트맵·내부 링크에 넣지 않는다.
export const metadata: Metadata = {
    title: { absolute: "OYK 아이디어 창고" },
    description: "원영킴포스트 영상 아이디어·영감 링크 보관함",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
    icons: { icon: "/idea/icon-180.png", apple: "/idea/icon-180.png" },
    appleWebApp: { capable: true, title: "OYK 아이디어", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
    themeColor: "#2448FF",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function IdeaLayout({ children }: { children: React.ReactNode }) {
    return <div className="oi">{children}</div>;
}
