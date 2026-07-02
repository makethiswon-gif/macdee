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

/* ── JSON-LD Structured Data (SSR rendered) ── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "macdee - 변호사 마케팅 자동화 플랫폼",
      alternateName: ["맥디", "MACDEE", "macdee"],
      description:
        "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원. 변호사 광고, 로펌 마케팅, 법무법인 광고를 AI가 자동화합니다.",
      inLanguage: "ko-KR",
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/magazine?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "macdee (맥디)",
      legalName: "메이크디스원",
      url: BASE_URL,
      description:
        "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원의 AI 법률 마케팅 자동화 플랫폼. 변호사 광고, 로펌 마케팅, 법무법인 광고 콘텐츠를 AI가 자동 생성합니다.",
      foundingDate: "2019",
      slogan: "2019년부터 변호사 법무법인 광고 트렌드를 선도하는 메이크디스원",
      areaServed: { "@type": "Country", name: "KR" },
      knowsAbout: [
        "변호사 광고",
        "로펌 마케팅",
        "법무법인 광고",
        "변호사 마케팅",
        "변호사 광고 대행",
        "변호사 블로그 마케팅",
        "법률 콘텐츠 마케팅",
        "변호사 온라인 마케팅",
        "변호사 SNS 마케팅",
        "법률 사무소 광고",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+82-10-8935-3010",
        contactType: "customer service",
        availableLanguage: "Korean",
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "KR",
        addressRegion: "서울특별시",
        addressLocality: "동대문구",
        streetAddress: "왕산로5길 13",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
