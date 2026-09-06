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
        title: "광고 운영",
        items: ["네이버 파워링크", "네이버 광고", "구글 광고", "유튜브 광고", "방문자 대상 재광고", "성과 기준 광고 운영"],
        note: "향후 법률광고가 가능해지는 새로운 광고 플랫폼도 검토해 추가합니다.",
    },
    {
        no: "02",
        en: "SEARCH",
        href: "/lawfirm-seo",
        title: "검색 노출",
        items: [
            "네이버 검색 노출 정비",
            "구글 검색 노출 정비",
            "검색을 위한 기술 정비",
            "지역 검색 정비",
            "검색 키워드 전략",
            "주제별 글 묶기",
            "관련 글 연결",
            "사이트 구조 최적화",
        ],
    },
    {
        no: "03",
        en: "AI SEARCH",
        href: "/geo",
        title: "AI 검색",
        items: [
            "AI 검색 대응(GEO)",
            "답변형 검색 대응(AEO)",
            "로펌·변호사 정보 정리",
            "ChatGPT 검색 대응",
            "Gemini 대응",
            "네이버 AI 검색 대응",
            "AI가 참고하기 쉬운 글 구조",
            "자주 묻는 질문·내용 구조화",
        ],
        note: "AI가 읽기 쉽게 정리하는 작업이며, 노출·추천을 보장하지 않습니다.",
    },
    {
        no: "04",
        en: "CONTENT",
        href: "/lawfirm-blog",
        title: "블로그·콘텐츠",
        items: [
            "네이버 블로그",
            "전문 법률 콘텐츠",
            "실제 사건 사례",
            "판례",
            "자주 묻는 질문",
            "법률 안내서",
            "변호사 브랜딩 콘텐츠",
            "영상",
            "쇼츠",
        ],
    },
    {
        no: "05",
        en: "WEBSITE",
        href: "/lawfirm-website",
        title: "홈페이지",
        items: [
            "홈페이지 제작·개편",
            "사건별 전용 페이지",
            "사용 편의성 개선",
            "모바일 최적화",
            "검색에 맞는 구조",
            "AI가 읽기 쉬운 구조",
            "상담 신청 경로 개선",
            "콘텐츠 지속 업데이트",
        ],
    },
    {
        no: "06",
        en: "DATA & CONVERSION",
        href: "/conversion",
        title: "상담·수임 분석",
        note: "수임 데이터는 로펌이 제공한 범위에서만 연결합니다.",
        items: [
            "광고별 유입 추적",
            "전화 · 카카오 · 폼 문의 구분",
            "유효상담 분석",
            "사건별 상담 1건당 비용",
            "수임 데이터 연계",
            "사건 수임 기록·상담 기록·성공사례 데이터베이스화",
        ],
    },
];

/* ── 콘텐츠 확장: 사건 하나 → 자산 일곱 ── */
const CONTENT_OUTPUTS = [
    "홈페이지 사례 소개",
    "블로그",
    "자주 묻는 질문",
    "검색용 콘텐츠",
    "AI 검색용 콘텐츠",
    "숏폼 영상",
    "광고 소재",
];

/* ── 데이터 비교 ── */
const GENERIC_REPORT = ["노출", "클릭", "클릭 비율", "클릭 1회당 비용", "방문자"];
const OUR_CHAIN = ["광고비", "문의", "상담", "유효상담", "방문", "수임", "수임매출"];

/* ── AI 자동화 (내부 운영) ── */
const AI_OPS = [
    "광고 데이터 분석",
    "키워드 분석",
    "콘텐츠 초안",
    "상담 질문 분류",
    "검색용 제목·설명",
    "관련 글 연결",
    "AI 검색 현황 확인",
    "경쟁사 모니터링",
    "월간 보고서",
    "광고 최적화 제안",
];

/* ── Client Portal 로드맵 (구상 중 — 확정 서비스 아님) ── */
const PORTAL_MENU = ["운영 현황", "광고", "문의", "콘텐츠", "승인", "검색", "AI 검색", "보고서", "사건"];

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
                            로펌 마케팅,
                            <br />
                            한 팀에서.
                        </h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[600px]">
                            광고·검색·콘텐츠·홈페이지를 함께 운영합니다.
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
                        title="사건 하나로, 여러 콘텐츠를."
                        lead="실제 사건과 질문으로 여러 콘텐츠를 기획합니다."
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
                        title="광고 성과를 상담·수임과 연결합니다."
                    />

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Reveal>
                            <div className="h-full px-7 py-9" style={{ border: "1px solid var(--mt-line)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                    노출·클릭 지표
                                </p>
                                <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14px]">
                                    {GENERIC_REPORT.map((g, i) => (
                                        <span key={g} className="flex items-center gap-2.5" style={{ color: "var(--mt-gray)" }}>
                                            {i > 0 && <span aria-hidden>→</span>}
                                            {g}
                                        </span>
                                    ))}
                                </div>
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
                        title="이렇게 운영합니다."
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
                                    반복 작업은 AI로,
                                    <br />
                                    판단은 사람이.
                                </h2>
                            </Reveal>
                            <Reveal index={2}>
                                <p className="mt-body mt-6 max-w-[420px]">
                                    AI로 분석과 초안 작업을 돕고, 사람이 확인합니다.
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
                            <h2 className="mt-h3 mt-5">내 로펌의 마케팅을 한눈에.</h2>
                            <p className="mt-body mt-4 max-w-[64ch] text-[14px]">
                                광고비·상담·수임·콘텐츠를 함께 확인하고 승인하는 고객용 화면을 구상 중입니다.
                                현재 제공되는 서비스는 아닙니다.
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
                            새로운 광고도,
                            <br />
                            같은 팀에서.
                        </h2>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body mt-6 max-w-[560px]">
                            지금은 네이버·구글·유튜브를 중심으로 운영합니다.
                            ChatGPT 등 새 광고는 법률 광고 허용 여부를 확인한 뒤 검토합니다.
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
