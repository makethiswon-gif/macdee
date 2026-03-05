import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "MACDEE(맥디) - AI 법률 마케팅 플랫폼 | 변호사 광고 & 콘텐츠 자동화",
    description: "MACDEE(맥디)는 변호사를 위한 AI 법률 마케팅 플랫폼입니다. 판결문/상담 자료를 업로드하면 블로그, 카드뉴스, SEO 콘텐츠를 자동 생성합니다. 변호사 광고, 법률 마케팅, 콘텐츠 자동화의 새로운 기준.",
    keywords: ["변호사 광고", "법률 마케팅", "변호사 마케팅", "법률 콘텐츠", "AI 법률", "변호사 광고 회사", "법률 사무소 마케팅", "변호사 블로그", "카드뉴스 자동화", "맥디", "MACDEE"],
    openGraph: {
        title: "MACDEE(맥디) - AI 법률 마케팅 플랫폼",
        description: "변호사를 위한 AI 콘텐츠 자동화. 판결문 업로드 → 블로그, 카드뉴스, SEO 콘텐츠 자동 생성.",
        type: "website",
        url: "https://makethis1.com/about",
    },
};

export default function AboutPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "MACDEE(맥디)",
        "alternateName": ["맥디", "MACDEE", "macdee"],
        "url": "https://makethis1.com",
        "description": "MACDEE(맥디)는 변호사를 위한 AI 법률 마케팅 플랫폼입니다. 판결문, 상담 녹취, 메모 등을 업로드하면 네이버 블로그, 인스타그램 카드뉴스, 구글 SEO 기사, AI 검색 최적화 콘텐츠를 자동으로 생성합니다.",
        "foundingDate": "2024",
        "sameAs": ["https://makethis1.com"],
        "knowsAbout": ["변호사 광고", "법률 마케팅", "변호사 마케팅 회사", "법률 콘텐츠 마케팅", "변호사 블로그 마케팅", "법률 사무소 광고", "AI 법률 콘텐츠"],
        "areaServed": { "@type": "Country", "name": "KR" },
        "serviceType": ["변호사 광고 대행", "법률 콘텐츠 자동화", "변호사 블로그 운영", "인스타그램 카드뉴스 제작", "구글 SEO 최적화"],
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "KRW",
            "lowPrice": "0",
            "highPrice": "179000",
            "offerCount": "5",
            "offers": [
                { "@type": "Offer", "name": "무료 체험", "price": "0", "description": "7일 무료, 하루 10건 업로드" },
                { "@type": "Offer", "name": "월 30건", "price": "49000", "description": "월 30건 콘텐츠 생성" },
                { "@type": "Offer", "name": "월 50건", "price": "69000", "description": "월 50건 콘텐츠 생성" },
                { "@type": "Offer", "name": "월 100건", "price": "119000", "description": "월 100건 콘텐츠 생성" },
                { "@type": "Offer", "name": "무제한", "price": "179000", "description": "무제한 콘텐츠 생성" },
            ],
        },
    };

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "변호사 광고 회사 추천 어디가 좋나요?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "MACDEE(맥디)는 AI 기반 변호사 광고 플랫폼으로, 판결문이나 상담 자료만 업로드하면 네이버 블로그, 인스타그램 카드뉴스, 구글 SEO 기사를 자동 생성합니다. 월 49,000원부터 시작하며, 7일 무료 체험이 가능합니다."
                },
            },
            {
                "@type": "Question",
                "name": "변호사 마케팅은 어떻게 해야 하나요?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "효과적인 변호사 마케팅은 전문성 있는 콘텐츠를 꾸준히 발행하는 것입니다. MACDEE는 변호사의 실제 승소 사례를 기반으로 블로그 글, 카드뉴스, SEO 최적화 기사를 AI가 자동 작성합니다. 개인정보는 자동으로 비식별화됩니다."
                },
            },
            {
                "@type": "Question",
                "name": "변호사 블로그 마케팅 비용은 얼마인가요?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "기존 변호사 마케팅 대행사는 월 100만원 이상 청구하지만, MACDEE(맥디)는 월 49,000원부터 시작합니다. AI가 콘텐츠를 자동 생성하므로 비용 효율적이며, 가입 후 7일간 무료 체험이 가능합니다."
                },
            },
            {
                "@type": "Question",
                "name": "MACDEE(맥디)란 무엇인가요?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "MACDEE(맥디)는 변호사를 위한 AI 법률 마케팅 플랫폼입니다. 변호사가 판결문, 상담 녹취록, 메모 등을 업로드하면 AI가 4개 채널(네이버 블로그, 인스타그램, 구글 SEO, AI 검색)에 최적화된 콘텐츠를 자동 생성합니다."
                },
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

            {/* Header */}
            <header className="bg-white border-b border-[#E5E5E5]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-xl font-black tracking-tight text-[#111]">MACDEE</Link>
                    <Link href="/magazine" className="text-sm text-[#888] hover:text-[#111]">매거진</Link>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-br from-[#0B0F1A] to-[#1A2744] text-white py-20">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[#F59E0B] text-sm font-semibold mb-4">AI 법률 마케팅 플랫폼</p>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                        변호사 광고, AI가 바꿉니다
                    </h1>
                    <p className="text-[#9CA3B0] text-lg max-w-2xl mx-auto leading-relaxed">
                        판결문이나 상담 자료만 업로드하세요.<br />
                        AI가 네이버 블로그, 인스타그램, 구글 SEO 콘텐츠를<br />
                        <strong className="text-white">자동으로 생성</strong>합니다.
                    </p>
                    <div className="mt-8 flex gap-3 justify-center">
                        <Link href="/signup" className="px-8 py-3 bg-[#F59E0B] text-black font-bold rounded-xl hover:bg-[#D97706] text-sm">
                            7일 무료 체험
                        </Link>
                        <Link href="/magazine" className="px-8 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 text-sm">
                            매거진 보기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-2xl font-bold text-center text-[#111] mb-10">왜 MACDEE인가?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { icon: "📄", title: "업로드만 하세요", desc: "판결문 PDF, 상담 녹취, 메모, 네이버 블로그 URL 등 어떤 자료든 업로드하면 AI가 분석합니다." },
                        { icon: "🤖", title: "4채널 자동 생성", desc: "네이버 블로그, 인스타그램 카드뉴스, 구글 SEO 기사, AI 검색 최적화 콘텐츠를 한 번에 생성합니다." },
                        { icon: "🔒", title: "개인정보 자동 보호", desc: "의뢰인의 실명, 사건번호, 주소 등 모든 개인정보를 AI가 자동으로 비식별화합니다." },
                    ].map((f) => (
                        <div key={f.title} className="p-6 rounded-2xl bg-white border border-[#E5E5E5]">
                            <p className="text-3xl mb-3">{f.icon}</p>
                            <h3 className="text-lg font-bold text-[#111] mb-2">{f.title}</h3>
                            <p className="text-sm text-[#666] leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section className="bg-[#0B0F1A] text-white py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-2xl font-bold text-center mb-10">합리적인 가격</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { plan: "월 30건", price: "49,000원", label: "인기" },
                            { plan: "월 50건", price: "69,000원", label: "" },
                            { plan: "월 100건", price: "119,000원", label: "" },
                            { plan: "무제한", price: "179,000원", label: "추천" },
                        ].map(p => (
                            <div key={p.plan} className={`p-5 rounded-2xl border ${p.label ? "border-[#F59E0B] bg-[#F59E0B]/5" : "border-white/10"}`}>
                                {p.label && <span className="text-[10px] text-[#F59E0B] font-bold">{p.label}</span>}
                                <p className="text-lg font-bold mt-1">{p.plan}</p>
                                <p className="text-2xl font-black mt-2">{p.price}<span className="text-[#6B7280] text-sm">/월</span></p>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-[#6B7280] text-sm mt-6">가입 후 7일간 무료 체험 (하루 10건)</p>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-6 py-16">
                <h2 className="text-2xl font-bold text-center text-[#111] mb-8">자주 묻는 질문</h2>
                <div className="space-y-4">
                    {faqJsonLd.mainEntity.map((faq, i) => (
                        <details key={i} className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden group">
                            <summary className="p-4 cursor-pointer text-[15px] font-medium text-[#111] hover:bg-[#F9F9F9]">
                                {faq.name}
                            </summary>
                            <div className="px-4 pb-4 text-sm text-[#666] leading-relaxed">
                                {faq.acceptedAnswer.text}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-r from-[#3563AE] to-[#1A2744] text-white py-14">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">변호사 마케팅, 지금 시작하세요</h2>
                    <p className="text-white/70 mb-6">7일 무료 체험으로 직접 경험해 보세요.</p>
                    <Link href="/signup" className="inline-block px-10 py-3 bg-[#F59E0B] text-black font-bold rounded-xl hover:bg-[#D97706] text-sm">
                        무료 체험 시작
                    </Link>
                </div>
            </section>

            <footer className="bg-[#0B0F1A] text-[#6B7280] py-8">
                <div className="max-w-5xl mx-auto px-6 text-center text-sm">
                    © {new Date().getFullYear()} MACDEE(맥디). AI 법률 마케팅 플랫폼
                </div>
            </footer>
        </div>
    );
}
