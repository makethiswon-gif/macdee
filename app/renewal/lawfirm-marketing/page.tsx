import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeader, Eyebrow, Button } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import { CHANNELS, SYSTEM_STEPS, PRIMARY_CTA, path, absUrl, ogImage } from "@/data/renewal/site";
import { breadcrumbJsonLd, graph, organizationId } from "@/lib/renewal/schema";
import { renewalRobots } from "../flags";

// WHAT WE DO 허브 — 한 팀이 실제로 하는 일의 전체 문서.
//
// 홈 서비스 섹션(01~06)이 목차라면, 이 페이지는 본문이다: 영역별 전체 품목과
// 운영 철학, 콘텐츠 확장 구조, 데이터 연결 범위, AI 원칙, Client Portal 로드맵.
//
// §42 가드레일:
//  - "AI 검색 노출·추천 보장" 류 표현 금지 — 오히려 안 쓴다는 사실을 명시한다.
//  - Client Portal 은 확정 서비스가 아니다 — "로드맵 · 구상 중" 을 화면에 박는다.
//  - 수임·매출 연결은 "로펌이 제공한 범위 안에서" 를 항상 붙인다.

const URL = absUrl("/lawfirm-marketing");
const TITLE = "로펌 통합 마케팅 | MAKETHIS1";
const DESC =
    "검색광고, 블로그, SEO, AI 검색, 홈페이지, 상담 분석까지 — 로펌에 필요한 모든 마케팅을 메이크디스원 한 팀이 운영합니다.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR", images: [ogImage()] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const jsonLd = graph(
    {
        "@type": "CollectionPage",
        "@id": `${URL}#webpage`,
        url: URL,
        name: TITLE,
        description: DESC,
        inLanguage: "ko-KR",
        about: { "@id": organizationId() },
    },
    {
        "@type": "ItemList",
        "@id": `${URL}#services`,
        itemListElement: CHANNELS.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: absUrl(c.href),
        })),
    },
    breadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "로펌 통합 마케팅", path: "/lawfirm-marketing" },
    ])
);

/* ═══════════════ 서비스 영역 상세 ═══════════════ */

interface Area {
    no: string;
    en: string;
    href: string;
    title: string;
    desc?: string;
    items: string[];
    note?: string;
}

const AREAS: Area[] = [
    {
        no: "01",
        en: "PAID MEDIA",
        href: "/naver-ads",
        title: "오늘 고객을 데려오는 광고",
        items: ["네이버 파워링크", "네이버 광고", "Google Ads", "YouTube Ads", "Retargeting", "Performance Ads"],
        note: "향후 법률광고가 가능해지는 새로운 광고 플랫폼도 검토해 추가합니다.",
    },
    {
        no: "02",
        en: "SEARCH",
        href: "/lawfirm-seo",
        title: "광고를 꺼도 남는 검색 자산",
        items: [
            "NAVER SEO",
            "Google SEO",
            "Technical SEO",
            "Local SEO",
            "검색 키워드 전략",
            "Topic Cluster",
            "Internal Linking",
            "사이트 구조 최적화",
        ],
    },
    {
        no: "03",
        en: "AI SEARCH",
        href: "/geo",
        title: "AI가 이해하는 로펌 구조",
        desc: "검색은 Google·네이버를 넘어 ChatGPT 같은 AI 환경으로 이동하고 있습니다. 그래서 AI 검색을 별도 서비스 영역으로 운영합니다.",
        items: [
            "GEO",
            "AEO",
            "Entity Optimization",
            "ChatGPT Search 대응",
            "Gemini 대응",
            "네이버 AI Search 대응",
            "AI Citation Optimization",
            "FAQ · Structured Content",
        ],
        note: "AI 검색 노출이나 추천을 보장한다는 표현은 쓰지 않습니다. 구조를 만드는 일이지, 결과를 약속하는 일이 아니기 때문입니다.",
    },
    {
        no: "04",
        en: "CONTENT",
        href: "/lawfirm-blog",
        title: "경험을 검색 자산으로",
        items: [
            "네이버 블로그",
            "전문 법률 콘텐츠",
            "실제 사건 사례",
            "판례",
            "FAQ",
            "Legal Guide",
            "변호사 브랜딩 콘텐츠",
            "영상",
            "Shorts",
        ],
        note: "중요한 것은 콘텐츠의 양이 아니라 확장 구조입니다 — 아래 '하나의 사건' 참고.",
    },
    {
        no: "05",
        en: "WEBSITE",
        href: "/lawfirm-website",
        title: "상담을 만드는 영업 자산",
        desc: "홈페이지 제작은 별개의 부가서비스가 아니라 마케팅 시스템의 일부입니다. 예쁘게 만드는 것이 목적이 아니라, 검색 유입을 받아 상담으로 바꾸는 영업 자산으로 만듭니다.",
        items: [
            "홈페이지 제작·개편",
            "사건별 Landing Page",
            "UX",
            "Mobile",
            "SEO 구조",
            "GEO 구조",
            "CRO",
            "콘텐츠 지속 업데이트",
        ],
    },
    {
        no: "06",
        en: "DATA & CONVERSION",
        href: "/conversion",
        title: "클릭이 아니라 사건을 봅니다",
        desc: "기존 광고대행과 가장 크게 달라지려는 부분입니다 — 아래 비교 참고.",
        items: [
            "광고별 유입 추적",
            "전화 · 카카오 · 폼 문의 구분",
            "유효상담 분석",
            "사건별 상담 CPA",
            "수임 데이터 연계",
            "사건 수임 기록·상담 기록·성공사례 데이터베이스화",
        ],
    },
];

/* ── 콘텐츠 확장: 사건 하나 → 자산 일곱 ── */
const CONTENT_OUTPUTS = [
    "홈페이지 Case Study",
    "블로그",
    "FAQ",
    "SEO 콘텐츠",
    "GEO 콘텐츠",
    "숏폼 영상",
    "광고 소재",
];

/* ── 데이터 비교 ── */
const GENERIC_REPORT = ["노출", "클릭", "CTR", "CPC", "방문자"];
const OUR_CHAIN = ["광고비", "문의", "상담", "유효상담", "방문", "수임", "수임매출"];

/* ── AI 자동화 (내부 운영) ── */
const AI_OPS = [
    "광고 데이터 분석",
    "키워드 분석",
    "콘텐츠 초안",
    "상담 질문 분류",
    "SEO 메타데이터",
    "내부링크",
    "GEO 모니터링",
    "경쟁사 모니터링",
    "월간 보고서",
    "광고 최적화 제안",
];

/* ── Client Portal 로드맵 (구상 중 — 확정 서비스 아님) ── */
const PORTAL_MENU = ["Dashboard", "Ads", "Leads", "Content", "Approval", "SEO", "GEO", "Reports", "Cases"];

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ── HERO ── */}
            <section className="mt-k-masthead" data-page="services">
                <Container>
                    <Reveal>
                        <Eyebrow>What we do</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-serif mt-h1 mt-7 max-w-[22ch]">
                            로펌에 필요한 모든 마케팅,
                            <br />
                            여기 다&nbsp;있습니다.
                        </h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[600px]">
                            채널을 여섯 개로 나눠 파는 것이 아닙니다. 필요한 영역을 한 팀이 함께
                            운영하고, 성과는 상담과 수임 기준으로 같은 표에서 봅니다.
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* ── 영역 상세 — 영역별 전체 품목 ── */}
            <Section tight>
                <Container>
                    <div style={{ borderTop: "1px solid var(--mt-line-strong)" }}>
                        {AREAS.map((area, i) => (
                            <Reveal key={area.no} index={i % 2}>
                                <div
                                    className="mt-k-area grid grid-cols-1 md:grid-cols-[240px_1fr] gap-x-10 gap-y-4 py-9"
                                    style={{ borderBottom: "1px solid var(--mt-line)" }}
                                >
                                    <div>
                                        <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                            {area.no}
                                        </p>
                                        <Link href={path(area.href)} className="group mt-2 inline-flex items-center gap-1.5">
                                            <span
                                                className="mt-en text-[13px] font-medium"
                                                style={{ color: "var(--mt-ink)", letterSpacing: "0.1em" }}
                                            >
                                                <span className="mt-underline">{area.en}</span>
                                            </span>
                                            <span
                                                aria-hidden
                                                className="text-[12px] transition-transform duration-200 group-hover:translate-x-1"
                                                style={{ color: "var(--mt-gray)" }}
                                            >
                                                →
                                            </span>
                                        </Link>
                                        <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--mt-ink)" }}>
                                            {area.title}
                                        </p>
                                    </div>

                                    <div>
                                        {area.desc && <p className="mt-body mb-4 text-[14px] max-w-[62ch]">{area.desc}</p>}
                                        <ul className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13.5px] leading-relaxed">
                                            {area.items.map((it, j) => (
                                                <li key={it} className="flex items-center" style={{ color: "var(--mt-charcoal)" }}>
                                                    {j > 0 && (
                                                        <span aria-hidden className="mx-2" style={{ color: "var(--mt-line-strong)" }}>
                                                            ·
                                                        </span>
                                                    )}
                                                    {it}
                                                </li>
                                            ))}
                                        </ul>
                                        {area.note && (
                                            <p className="mt-4 text-[12.5px]" style={{ color: "var(--mt-gray)" }}>
                                                {area.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </Section>

            {/* ── 콘텐츠 확장 구조 — 하나의 사건이 일곱 개의 자산이 된다 ── */}
            <Section tight>
                <Container>
                    <SectionHeader
                        eyebrow="Content System"
                        serif
                        title="하나의 사건이 일곱 개의 자산이 됩니다."
                        lead="콘텐츠의 양이 아니라 확장 구조가 중요합니다. 실제 사건 하나, 고객 질문 하나를 여러 마케팅 자산으로 확장합니다."
                    />

                    <Reveal variant="fade">
                        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[240px_56px_1fr] gap-y-6 items-center">
                            <div
                                className="px-6 py-7 text-center rounded-[2px]"
                                style={{ border: "1px solid var(--mt-accent)", background: "var(--mt-surface)" }}
                            >
                                <p className="mt-en text-[9.5px] font-medium mb-2" style={{ color: "var(--mt-accent)" }}>
                                    Source
                                </p>
                                <p className="text-[15px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                    실제 사건 하나
                                </p>
                            </div>

                            {/* 파란 실 — 하나에서 일곱으로 (데스크톱) */}
                            <div className="hidden lg:block h-full" aria-hidden="true">
                                <svg className="mt-team-lines w-full h-full" viewBox="0 0 56 100" preserveAspectRatio="none">
                                    {CONTENT_OUTPUTS.map((_, i) => {
                                        const y = 8 + i * (84 / 6);
                                        return (
                                            <path
                                                key={i}
                                                d={`M 0 50 C 28 50, 28 ${y}, 56 ${y}`}
                                                fill="none"
                                                stroke="var(--mt-accent)"
                                                strokeWidth="1"
                                                vectorEffect="non-scaling-stroke"
                                                pathLength={1}
                                                opacity="0.55"
                                            />
                                        );
                                    })}
                                </svg>
                            </div>

                            <ul className="flex flex-wrap lg:flex-col gap-2">
                                {CONTENT_OUTPUTS.map((o, i) => (
                                    <Reveal key={o} as="li" index={i} stagger={70}>
                                        <span
                                            className="inline-block px-3.5 py-[7px] text-[13px] rounded-[2px]"
                                            style={{
                                                border: "1px solid var(--mt-line)",
                                                background: "var(--mt-surface)",
                                                color: "var(--mt-charcoal)",
                                            }}
                                        >
                                            {o}
                                        </span>
                                    </Reveal>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                </Container>
            </Section>

            {/* ── 데이터 차별화 — 어디까지 연결하는가 ── */}
            <Section dark tight>
                <Container>
                    <SectionHeader
                        eyebrow="Data & Conversion"
                        serif
                        title="클릭이 아니라 사건을 봅니다."
                        lead="기존 광고 대행과 가장 크게 달라지려는 부분입니다. 보고서가 어디에서 끝나는지가 회사의 차이를 만듭니다."
                    />

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Reveal>
                            <div className="h-full px-7 py-9" style={{ border: "1px solid var(--mt-line)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                    일반적인 광고 보고서
                                </p>
                                <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14px]">
                                    {GENERIC_REPORT.map((g, i) => (
                                        <span key={g} className="flex items-center gap-2.5" style={{ color: "var(--mt-gray)" }}>
                                            {i > 0 && <span aria-hidden>→</span>}
                                            {g}
                                        </span>
                                    ))}
                                </div>
                                <p className="mt-5 text-[13px]" style={{ color: "var(--mt-gray)" }}>
                                    보통 여기서 끝납니다.
                                </p>
                            </div>
                        </Reveal>

                        <Reveal index={1}>
                            <div className="h-full px-7 py-9" style={{ border: "1px solid var(--mt-accent)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    MAKETHIS1
                                </p>
                                <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14px] font-medium">
                                    {OUR_CHAIN.map((c, i) => (
                                        <span key={c} className="flex items-center gap-2.5" style={{ color: "var(--mt-bg)" }}>
                                            {i > 0 && (
                                                <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                                    →
                                                </span>
                                            )}
                                            {c}
                                        </span>
                                    ))}
                                </div>
                                <p className="mt-5 text-[13px]" style={{ color: "var(--mt-gray)" }}>
                                    수임과 매출은 로펌이 제공한 범위 안에서 연결합니다.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </Section>

            {/* ── 운영 시스템 — 홈 여정과 같은 6단계 ── */}
            <Section id="system">
                <Container>
                    <SectionHeader
                        eyebrow="Our System"
                        serif
                        title={
                            <>
                                고객이 로펌을 발견하는 순간부터
                                <br />
                                사건을 맡기는 순간까지.
                            </>
                        }
                    />
                    <ol className="mt-14">
                        {SYSTEM_STEPS.map((s, i) => (
                            <Reveal key={s.no} as="li" index={i % 3}>
                                <div
                                    className="mt-k-process grid grid-cols-1 md:grid-cols-[72px_260px_1fr] gap-x-8 gap-y-3 py-8"
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <span className="mt-en mt-num text-[12px] font-medium pt-1" style={{ color: "var(--mt-accent)" }}>
                                        {s.no}
                                    </span>
                                    <div>
                                        <p className="mt-en mt-label mb-3" style={{ color: "var(--mt-gray)" }}>
                                            {s.en}
                                        </p>
                                        <h3 className="mt-h3">{s.title}</h3>
                                    </div>
                                    <p className="mt-body max-w-[520px]">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </ol>
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                </Container>
            </Section>

            {/* ── AI 원칙 ── */}
            <Section tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 lg:gap-20">
                        <div>
                            <Reveal>
                                <Eyebrow>Automation</Eyebrow>
                            </Reveal>
                            <Reveal index={1}>
                                <h2 className="mt-serif mt-h2 mt-6">
                                    AI is HOW,
                                    <br />
                                    not WHAT.
                                </h2>
                            </Reveal>
                            <Reveal index={2}>
                                <p className="mt-body mt-6 max-w-[420px]">
                                    AI는 고객에게 파는 상품이 아니라, 내부 운영 효율을 높이는 기술입니다.
                                    같은 예산으로 더 많은 일이 돌아가게 만드는 방법이지, 서비스의 이름이
                                    아닙니다.
                                </p>
                            </Reveal>
                        </div>

                        <Reveal index={1}>
                            <div>
                                <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                    내부에서 자동화하는 일
                                </p>
                                <ul className="flex flex-wrap gap-2">
                                    {AI_OPS.map((op) => (
                                        <li
                                            key={op}
                                            className="px-3 py-[6px] text-[12.5px] rounded-[2px]"
                                            style={{ border: "1px solid var(--mt-line)", color: "var(--mt-gray)" }}
                                        >
                                            {op}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </Section>

            {/* ── Client Portal — 로드맵 (확정 서비스 아님) ── */}
            <Section tight>
                <Container>
                    <Reveal>
                        <div
                            className="px-7 py-9 md:px-10 md:py-11 rounded-[2px]"
                            style={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)" }}
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <Eyebrow>Client Portal</Eyebrow>
                                <span
                                    className="mt-en text-[9px] font-medium px-2 pt-[4px] pb-[3px] rounded-[2px]"
                                    style={{ border: "1px solid var(--mt-line-strong)", color: "var(--mt-gray)" }}
                                >
                                    로드맵 · 구상 중
                                </span>
                            </div>
                            <h2 className="mt-h3 mt-5">로펌마다 자기 마케팅을 직접 들여다보는 화면.</h2>
                            <p className="mt-body mt-4 max-w-[64ch] text-[14px]">
                                이번 달 광고비, 상담 수, 유효상담, 수임, 콘텐츠 승인, SEO·GEO 상태를 한
                                화면에서 보는 Client Portal 을 구상하고 있습니다. 장기적으로는 광고
                                데이터와 상담·수임 데이터가 연결되는{" "}
                                <strong className="font-semibold" style={{ color: "var(--mt-ink)" }}>
                                    Law Firm Marketing OS
                                </strong>
                                로 발전시키는 것이 목표입니다.
                            </p>
                            <ul className="mt-6 flex flex-wrap gap-2" aria-label="구상 중인 포털 메뉴">
                                {PORTAL_MENU.map((m) => (
                                    <li
                                        key={m}
                                        className="mt-en text-[10px] font-medium px-2.5 pt-[5px] pb-[4px] rounded-[2px]"
                                        style={{ border: "1px solid var(--mt-line)", color: "var(--mt-gray)" }}
                                    >
                                        {m}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                </Container>
            </Section>

            {/* ── Future Ready ── */}
            <Section dark tight>
                <Container>
                    <Reveal>
                        <Eyebrow>Future Ready</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h2 className="mt-serif mt-h2 mt-6 max-w-[24ch]">
                            새로운 광고 플랫폼이 등장할 때마다,
                            <br />
                            새로운 대행사를 찾을 필요가 없습니다.
                        </h2>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body mt-6 max-w-[560px]">
                            특정 플랫폼에 종속되지 않습니다. 지금은 네이버·Google·YouTube 가 중심이지만,
                            ChatGPT Ads 같은 AI 기반 광고 플랫폼이 법률광고 채널로 열리면 검토해 기존
                            시스템에 편입합니다.
                        </p>
                    </Reveal>

                    <Reveal index={3}>
                        <div className="mt-12">
                            <Button href={path(PRIMARY_CTA.href)} variant="outline">
                                {PRIMARY_CTA.label} <span aria-hidden>→</span>
                            </Button>
                        </div>
                    </Reveal>
                </Container>
            </Section>
        </>
    );
}
