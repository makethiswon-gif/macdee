import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

export const metadata: Metadata = {
    title: "법률 마케팅 인사이트 매거진 | macdee insights",
    description:
        "변호사 광고, 로펌 마케팅, 법무법인 광고 트렌드와 전략을 다루는 macdee insights 매거진. 법률 마케팅 전문가가 직접 쓰는 시장 분석, 트렌드 리포트.",
    keywords: [
        "변호사 광고 트렌드",
        "로펌 마케팅 전략",
        "법률 마케팅 인사이트",
        "변호사 마케팅 블로그",
        "법무법인 광고 방법",
    ],
    alternates: {
        canonical: `${BASE_URL}/magazine`,
    },
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        title: "법률 마케팅 인사이트 매거진 | macdee insights",
        description:
            "변호사 광고, 로펌 마케팅 트렌드와 전략. 법률 마케팅 전문가가 직접 쓰는 인사이트.",
        type: "website",
        url: `${BASE_URL}/magazine`,
    },
};

export default function MagazineLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
