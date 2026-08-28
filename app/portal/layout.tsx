import type { Metadata } from "next";
import "../renewal/renewal.css";

// Client Portal — 로펌 클라이언트와 대표를 잇는 업무 공간.
// 마케팅 사이트와 같은 디자인 언어(.mt-root)를 쓰되, 완전히 비공개다.

export const metadata: Metadata = {
    title: { absolute: "Client Portal | MAKETHIS1" },
    robots: { index: false, follow: false, nocache: true },
};

// 파싱 중 mt-js 를 붙인다 — renewal 레이아웃과 동일한 이유(리빌 게이트).
const JS_MARKER = "document.documentElement.classList.add('mt-js')";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-root min-h-screen flex flex-col">
            <script dangerouslySetInnerHTML={{ __html: JS_MARKER }} />
            {children}
        </div>
    );
}
