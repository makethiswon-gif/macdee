import { Container, Button, Eyebrow, Stat } from "../primitives";
import Reveal from "../Reveal";
import Logo from "../Logo";
import HeroIntro from "./HeroIntro";
import {
    HERO_QUESTIONS,
    HERO_RESULT,
    PROOF_STATS,
    PRIMARY_CTA,
    CONTRACT_SCOPE,
    INTRO_CARDS,
    INTRO_KEYWORDS_MOBILE,
    path,
} from "@/data/renewal/site";

// HERO — "여러 업체가 하나의 계약으로" 인트로 무대 (The Contract).
//
// 설계 원칙: 기본(서버 HTML + CSS) 상태가 곧 최종 상태다.
//   - JS 실패/reduced-motion/재방문 → 인트로 없이 최종 히어로가 그대로 보인다.
//   - 인트로는 프리페인트 인라인 스크립트가 html[data-intro="play"] 를 붙일 때만
//     CSS 타임라인으로 재생된다(1회/세션, sessionStorage 'renewalIntroSeen').
//   - 스킵(스크롤/클릭/키) = 속성 제거 = 즉시 최종 상태 (HeroIntro.tsx).
//   - 오버레이는 전부 absolute → CLS 없음. 높이는 처음부터 min-h 로 확보.
//
// 타임라인(renewal.css, --iT 로 모바일 단축): 카드 등장 → 취소선·파란 연결선 →
// 중앙 수렴 → 계약서 조립 + 직인 → 선언 → 계약서 우측 정착 + 좌측 카피 등장.

// 프리페인트 부트 — 파싱 중 실행되어 첫 페인트 전에 재생 여부를 정한다.
// 여기서 seen 을 기록하므로 같은 세션에서는 다시 재생되지 않는다.
const INTRO_BOOT =
    "(function(){try{var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;" +
    "if(!r&&!sessionStorage.getItem('renewalIntroSeen')){" +
    "document.documentElement.setAttribute('data-intro','play');" +
    "sessionStorage.setItem('renewalIntroSeen','1');}}catch(e){}})()";

// 카드 스프레드 좌표(px, 무대 중앙 기준)와 기울기 — 종이가 흩어져 있던 자리
const CARD_SPREAD = [
    { x: -460, y: -170, r: -6 },
    { x: -130, y: -215, r: 4 },
    { x: 215, y: -160, r: -3 },
    { x: -330, y: 130, r: 5 },
    { x: 80, y: 185, r: -5 },
];

// 연결선(%) — 카드 자리에서 중앙(50,46)으로. viewBox 100×100 근사.
const LINE_FROM = [
    { x: 16, y: 24 },
    { x: 40, y: 17 },
    { x: 66, y: 26 },
    { x: 26, y: 64 },
    { x: 56, y: 72 },
];

// 모바일 키워드 칩 스프레드(px, 중앙 기준)
const CHIP_SPREAD = [
    { x: -118, y: -84 },
    { x: 78, y: -100 },
    { x: -96, y: 10 },
    { x: 104, y: -6 },
    { x: -6, y: 92 },
];

function ContractCard() {
    return (
        <aside className="mt-contract relative" aria-label="ONE CONTRACT — 계약 범위 요약">
            <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                One Contract
            </p>

            <ul className="mt-5">
                {CONTRACT_SCOPE.map((a, i) => (
                    <li
                        key={a.en}
                        className="mt-contract-row mt-en flex items-baseline justify-between gap-4 py-[9px] text-[11px] font-medium"
                        style={{
                            borderTop: "1px solid var(--mt-line)",
                            color: "var(--mt-ink)",
                            ["--i" as string]: i,
                        }}
                    >
                        {a.en}
                        <span className="mt-num text-[9px]" style={{ color: "var(--mt-gray-light)" }}>
                            {a.no.replace("별지 ", "")}
                        </span>
                    </li>
                ))}
            </ul>

            <div
                className="mt-6 pt-4 flex items-end justify-between"
                style={{ borderTop: "1px solid var(--mt-line-strong)" }}
            >
                <Logo size={13} />
                <span className="mt-stamp-blue" aria-hidden>
                    ONE CONTRACT
                    <br />
                    ONE TEAM
                    <br />
                    MAKETHIS1
                </span>
            </div>
        </aside>
    );
}

export default function HeroSection() {
    return (
        <section data-clause="전문" className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
            <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
            <HeroIntro />

            <Container>
                <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:items-center">
                    {/* ── 좌측 — 카피 (기본 가시, 인트로 중엔 늦게 슬라이드-인) ── */}
                    <div className="mt-hero-copy">
                        <div className="mt-hero-in">
                            <Eyebrow>Law Firm Marketing · One Team</Eyebrow>
                        </div>

                        <h1 className="mt-serif mt-display mt-8 max-w-[16ch]" style={{ lineHeight: 1.16 }}>
                            <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                                로펌 마케팅,
                            </span>
                            <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "120ms" }}>
                                이제 한 곳이면 됩니다.
                            </span>
                        </h1>

                        <ul className="mt-10 flex flex-col gap-1.5" aria-label="지금까지의 분산 발주">
                            {HERO_QUESTIONS.map((q, i) => (
                                <li
                                    key={q}
                                    className="mt-hero-in text-[14px] md:text-[14.5px]"
                                    style={{
                                        ["--mt-hero-delay" as string]: `${200 + i * 70}ms`,
                                        color: "var(--mt-gray)",
                                    }}
                                >
                                    <span
                                        className="mt-strike"
                                        style={{ ["--strike-delay" as string]: `${900 + i * 160}ms` }}
                                    >
                                        {q}
                                    </span>
                                </li>
                            ))}
                            <li
                                className="mt-hero-in mt-3 text-[15.5px] md:text-[16.5px] font-semibold max-w-[560px] leading-[1.65]"
                                style={{
                                    ["--mt-hero-delay" as string]: "580ms",
                                    color: "var(--mt-ink)",
                                }}
                            >
                                {HERO_RESULT}
                            </li>
                        </ul>

                        <div className="mt-hero-in" style={{ ["--mt-hero-delay" as string]: "660ms" }}>
                            <div className="mt-12 flex flex-col sm:flex-row gap-3">
                                <Button href={path(PRIMARY_CTA.href)} variant="primary">
                                    우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                                </Button>
                                <Button href={path("/#system")} variant="outline">
                                    어떻게 하는지 보기
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── 우측 — 계약서 (최종 비주얼, 인트로의 종착점) ── */}
                    <div className="mt-12 lg:mt-0 max-w-[400px] lg:max-w-none">
                        <ContractCard />
                        {/* 계약서 아래에서 파란 실이 다음 섹션(의뢰인 여정)으로 이어진다 */}
                        <Reveal variant="line" className="mt-thread-v block w-px h-12 md:h-14 mx-auto mt-6">
                            <span aria-hidden />
                        </Reveal>
                    </div>

                    {/* ── 인트로 오버레이 — play 중에만 존재. 레이아웃에 관여하지 않는다 ── */}
                    <div className="mt-intro-layer absolute inset-0 pointer-events-none select-none" aria-hidden="true">
                        {/* 데스크톱: 업체 카드 5장 */}
                        <div className="hidden lg:block absolute inset-0">
                            {INTRO_CARDS.map((c, i) => (
                                <div
                                    key={c.name}
                                    className="mt-icard"
                                    style={{
                                        ["--sx" as string]: `${CARD_SPREAD[i].x}px`,
                                        ["--sy" as string]: `${CARD_SPREAD[i].y}px`,
                                        ["--sr" as string]: `${CARD_SPREAD[i].r}deg`,
                                        ["--i" as string]: i,
                                    }}
                                >
                                    <p className="text-[13px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                        <span
                                            className="mt-strike"
                                            style={{
                                                ["--strike-delay" as string]: `calc((0.85s + ${i} * 0.12s) * var(--iT))`,
                                            }}
                                        >
                                            {c.name}
                                        </span>
                                    </p>
                                    <p className="mt-1.5 text-[11px]" style={{ color: "var(--mt-gray)" }}>
                                        {c.sub}
                                    </p>
                                </div>
                            ))}

                            {/* 파란 연결선 */}
                            <svg
                                className="mt-ilines absolute inset-0 w-full h-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                {LINE_FROM.map((p, i) => (
                                    <line
                                        key={i}
                                        x1={p.x}
                                        y1={p.y}
                                        x2="50"
                                        y2="46"
                                        stroke="var(--mt-accent)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                        style={{ ["--i" as string]: i }}
                                    />
                                ))}
                            </svg>

                            {/* 중앙 질문 (0~1.4s) */}
                            <div className="mt-iquestion absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-center w-[min(560px,80%)]">
                                <p className="mt-serif font-semibold text-[clamp(1.4rem,2.4vw,1.9rem)] leading-[1.5]" style={{ color: "var(--mt-ink)" }}>
                                    이 모든 업체를
                                    <br />
                                    로펌이 직접 관리해야 합니까?
                                </p>
                            </div>

                            {/* 핵심 선언 (1.95~2.65s) */}
                            <div className="mt-istatement absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-center w-[min(720px,88%)]">
                                <p className="mt-serif font-bold text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.4]" style={{ color: "var(--mt-ink)" }}>
                                    여러 업체를 관리하는 일,
                                    <br />이 계약으로 끝납니다.
                                </p>
                                <p className="mt-5 text-[14px] leading-[1.8]" style={{ color: "var(--mt-gray)" }}>
                                    광고·검색·콘텐츠·홈페이지·전환까지,
                                    <br className="sm:hidden" /> MAKETHIS1이 하나의 책임 체계로 운영합니다.
                                </p>
                            </div>
                        </div>

                        {/* 모바일: 키워드 칩 5개 → 수렴 */}
                        <div className="lg:hidden absolute inset-0">
                            {INTRO_KEYWORDS_MOBILE.map((k, i) => (
                                <span
                                    key={k}
                                    className="mt-ichip"
                                    style={{
                                        ["--sx" as string]: `${CHIP_SPREAD[i].x}px`,
                                        ["--sy" as string]: `${CHIP_SPREAD[i].y}px`,
                                        ["--i" as string]: i,
                                    }}
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Container>

            {/* 검증 근거 — 이미 대외 공표 중인 수치만(§42) */}
            <div className="mt-hero-stats mt-16 md:mt-24">
                <Container>
                    <Reveal variant="line" index={6} stagger={90}>
                        <span className="block h-px w-full" style={{ background: "var(--mt-line)" }} />
                    </Reveal>
                    <Reveal variant="rise" index={7} stagger={90}>
                        <div className="mt-8 flex flex-wrap gap-x-16 gap-y-6">
                            {PROOF_STATS.map((s) => (
                                <Stat key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
                            ))}
                        </div>
                    </Reveal>
                </Container>
            </div>
        </section>
    );
}
