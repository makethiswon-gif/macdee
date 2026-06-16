import { Metadata } from "next";
import DiagnoseClient from "./DiagnoseClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

export const metadata: Metadata = {
    title: "변호사 온라인 마케팅 무료 AI 진단 | macdee",
    description:
        "내 블로그가 구글·AI 검색에서 어떻게 보이는지 1분 만에 진단받으세요. 변호사 이름과 블로그 주소만 입력하면 AI가 노출 상태·개선점을 무료로 분석해 드립니다.",
    alternates: { canonical: `${BASE_URL}/diagnose` },
    robots: { index: true, follow: true },
    openGraph: {
        title: "변호사 온라인 마케팅 무료 AI 진단",
        description: "블로그 주소만 입력하면 AI가 노출 상태와 개선점을 무료로 분석합니다.",
        type: "website",
        url: `${BASE_URL}/diagnose`,
        images: [`${BASE_URL}/og-image.png`],
    },
};

export default function DiagnosePage() {
    return <DiagnoseClient />;
}
