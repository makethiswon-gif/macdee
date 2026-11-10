import type { Metadata, Viewport } from "next";
import "./admin.css";

// 준일 홈페이지 관리자 모드 — 색인 금지(메타 + middleware X-Robots-Tag), 사이트맵·내부 링크에 넣지 않는다.
export const metadata: Metadata = {
    title: { absolute: "관리자 모드 | 법률사무소 준일" },
    description: "법률사무소 준일 홈페이지 게시판 관리",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
    icons: { icon: "/junil-site/img/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#060303", width: "device-width", initialScale: 1 };

export default function JunilAdminLayout({ children }: { children: React.ReactNode }) {
    return <div className="ja">{children}</div>;
}
