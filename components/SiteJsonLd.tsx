const BASE_URL = "https://www.makethis1.com";

// 사이트 전역 구조화 데이터 (WebSite + Organization).
//
// 원래 app/layout.tsx 에 있었다. 루트 레이아웃은 경로를 알 수 없어서
// /renewal(MAKETHIS1 리뉴얼 데모)에도 macdee 기준 스키마가 같이 나갔다.
// 한 페이지에 서로 다른 회사의 Organization 이 둘 뜨는 상태였다.
//
// JSON 내용은 그대로 두고 렌더 위치만 홈으로 옮겼다.
// 이 @id 들을 참조하는 곳은 app/page.tsx 하나뿐이라 같은 페이지 안에서 해결된다.
// 다른 라이브 페이지(/about, /magazine 등)는 각자 자체 스키마를 이미 갖고 있다.

/* ── JSON-LD Structured Data (SSR rendered) ── */
const siteJsonLd = {
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

export default function SiteJsonLd() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
    );
}
