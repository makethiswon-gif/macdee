import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "macdee | 변호사 마케팅 자동화 플랫폼",
  description:
    "업무에 집중하세요. 마케팅은 AI 맥디가 쉬지 않고. 판결문 PDF, 상담 녹취, 메모를 올리면 AI가 네이버 블로그, 인스타그램, 구글 SEO, AI 검색 최적화 콘텐츠를 자동 생성하고 4개 채널에 동시 발행합니다.",
  keywords: [
    "변호사 마케팅",
    "법률 마케팅 자동화",
    "변호사 블로그",
    "법률 콘텐츠",
    "macdee",
    "맥디",
  ],
  openGraph: {
    title: "macdee | 변호사 마케팅 자동화 플랫폼",
    description:
      "판결문 올리면 3분 만에 4개 채널 자동 발행. 변호사를 위한 AI 마케팅 솔루션.",
    type: "website",
    locale: "ko_KR",
    siteName: "macdee",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "macdee - 변호사 마케팅 자동화 플랫폼" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "macdee | 변호사 마케팅 자동화 플랫폼",
    description: "판결문 올리면 3분 만에 4개 채널 자동 발행.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
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

