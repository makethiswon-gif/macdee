import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const BASE_URL = "https://www.makethis1.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "macdee | 변호사 광고 · 로펌 마케팅 자동화 플랫폼",
    template: "%s | macdee - 변호사 마케팅 자동화",
  },
  description:
    "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원",
  keywords: [
    "변호사 광고",
    "로펌 마케팅",
    "법무법인 광고",
    "변호사 마케팅",
    "변호사 광고 대행",
    "변호사 블로그 마케팅",
    "법률 마케팅",
    "변호사 마케팅 회사",
    "법률 사무소 광고",
    "변호사 콘텐츠 마케팅",
    "변호사 온라인 마케팅",
    "변호사 블로그 대행",
    "AI 법률 마케팅",
    "변호사 SNS 마케팅",
    "로펌 광고 대행",
    "법률 콘텐츠 자동화",
    "macdee",
    "맥디",
  ],
  // canonical은 전역 상속 금지 — 각 페이지가 자체 canonical 지정(홈은 app/page.tsx).
  // 여기 두면 /login·/admin·/terms 등 하위 전부가 홈페이지 canonical을 상속하는 버그 발생.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: [
      "cTiG7kJY3Ek_yruEj27Xy9cZaCi_Uc4Ow0gemZU3DFU",
      "4r5g30NhEdeWjEDsTB9gzfv-tl4E4aGaK28YR_CsCqA",
    ],
    other: {
      "naver-site-verification": ["1ceeba9df7538a048152a5559ea8a9299b99e89b", "8465ab5c68d5a881aba4567c053681cd58000718"],
    },
  },
  openGraph: {
    title: "macdee | 변호사 광고 · 로펌 마케팅 자동화 플랫폼",
    description:
      "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원",
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "macdee - 변호사 마케팅 자동화",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "macdee - 변호사 광고 · 로펌 마케팅 자동화 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "macdee | 변호사 광고 · 로펌 마케팅 자동화",
    description:
      "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: 리뉴얼/포털의 프리페인트 스크립트가 html 에
  // mt-js·data-intro 를 붙인다(테마 스크립트와 같은 표준 패턴). 이 속성 차이로
  // dev 하이드레이션 경고가 뜨는 것을 막는다 — 렌더 동작에는 영향 없음.
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: { fontFamily: "'Noto Sans KR', sans-serif" },
          }}
        />
      </body>
    </html>
  );
}
