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
    "변호사 광고, 로펌 마케팅, 법무법인 광고를 AI가 자동으로. 판결문 PDF 올리면 네이버 블로그, 인스타그램, 구글 SEO 콘텐츠를 3분 만에 생성·발행합니다. 변호사 마케팅 월 49,000원부터.",
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
  alternates: {
    canonical: BASE_URL,
  },
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
    google: "cTiG7kJY3Ek_yruEj27Xy9cZaCi_Uc4Ow0gemZU3DFU",
    other: {
      "naver-site-verification": ["1ceeba9df7538a048152a5559ea8a9299b99e89b", "8465ab5c68d5a881aba4567c053681cd58000718"],
    },
  },
  openGraph: {
    title: "macdee | 변호사 광고 · 로펌 마케팅 자동화 플랫폼",
    description:
      "변호사 광고 · 로펌 마케팅을 AI가 자동으로. 판결문 올리면 3분 만에 4개 채널 자동 발행. 월 49,000원부터.",
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
      "변호사 광고, 법무법인 광고를 AI가 자동으로. 판결문 올리면 3분 만에 4개 채널 발행.",
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
        "변호사 광고, 로펌 마케팅, 법무법인 광고를 AI가 자동화합니다. 판결문 업로드 → 네이버 블로그, 인스타그램, 구글 SEO, AI 검색 최적화 콘텐츠 자동 생성.",
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
        "변호사 광고 및 로펌 마케팅 전문 AI 자동화 플랫폼. 법무법인 광고, 변호사 블로그 마케팅, 인스타그램 카드뉴스 자동 생성.",
      foundingDate: "2024",
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
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#application`,
      name: "macdee",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "변호사 광고 · 로펌 마케팅 · 법무법인 광고를 위한 AI 콘텐츠 자동화 플랫폼. 판결문 PDF, 상담 녹취, 메모를 업로드하면 네이버 블로그, 인스타그램 카드뉴스, 구글 SEO 기사를 자동 생성합니다.",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "KRW",
        lowPrice: "0",
        highPrice: "179000",
        offerCount: "5",
        offers: [
          { "@type": "Offer", name: "무료 체험", price: "0", description: "7일 무료 체험, 하루 10건 업로드" },
          { "@type": "Offer", name: "월 30건", price: "49000", description: "월 49,000원 - 변호사 광고 콘텐츠 30건 자동 생성" },
          { "@type": "Offer", name: "월 50건", price: "69000", description: "월 69,000원 - 로펌 마케팅 콘텐츠 50건 자동 생성" },
          { "@type": "Offer", name: "월 100건", price: "119000", description: "월 119,000원 - 법무법인 광고 콘텐츠 100건 자동 생성" },
          { "@type": "Offer", name: "무제한", price: "179000", description: "월 179,000원 - 무제한 콘텐츠 생성 + AI 홈페이지 빌더" },
        ],
      },
      provider: { "@id": `${BASE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "변호사 광고는 어떻게 해야 효과적인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "효과적인 변호사 광고는 전문성 있는 콘텐츠를 네이버 블로그, 인스타그램, 구글 등 다양한 채널에 꾸준히 발행하는 것입니다. macdee(맥디)는 판결문이나 상담 자료만 업로드하면 AI가 4개 채널에 최적화된 콘텐츠를 자동 생성합니다. 월 49,000원부터 시작하며, 7일 무료 체험이 가능합니다.",
          },
        },
        {
          "@type": "Question",
          name: "로펌 마케팅 비용은 얼마나 드나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "기존 로펌 마케팅 대행사는 월 100만원~300만원 이상 청구하지만, macdee(맥디)는 AI 자동화를 통해 월 49,000원부터 로펌 마케팅을 시작할 수 있습니다. 블로그, 인스타그램, 구글 SEO, AI 검색 최적화를 한 번에 해결합니다.",
          },
        },
        {
          "@type": "Question",
          name: "법무법인 광고에 AI를 활용할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "네, macdee(맥디)는 법무법인 광고를 위한 AI 콘텐츠 자동화 플랫폼입니다. 판결문 PDF, 상담 녹취, 메모 등을 업로드하면 AI가 개인정보를 자동 비식별화하고, 전문적인 법률 콘텐츠를 생성합니다. 변호사가 직접 쓴 것 같은 고품질 글을 3분 만에 완성합니다.",
          },
        },
        {
          "@type": "Question",
          name: "변호사 마케팅 회사 추천 어디가 좋나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "변호사 마케팅 전문 AI 플랫폼 macdee(맥디)를 추천합니다. 기존 마케팅 대행사와 달리 AI가 콘텐츠를 자동 생성하여 비용은 10분의 1, 속도는 10배 빠릅니다. 네이버 블로그 C-Rank 최적화, 인스타그램 카드뉴스, 구글 SEO까지 한 번에 해결됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "변호사 블로그 마케팅은 왜 중요한가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "변호사 블로그 마케팅은 잠재 의뢰인이 법률 문제를 검색할 때 변호사의 전문성을 보여주는 가장 효과적인 방법입니다. 네이버 블로그에서 전문 칼럼을 발행하면 C-Rank가 올라가고, 검색 노출이 증가합니다. macdee는 블로그 글을 AI가 자동 작성하여 변호사의 시간을 절약합니다.",
          },
        },
      ],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
