import { Container, Button, Eyebrow, Stat } from "../primitives";
import Reveal from "../Reveal";
import Logo from "../Logo";
import IntroScreen from "./IntroScreen";
import {
    HERO_QUESTIONS,
    HERO_RESULT,
    PROOF_STATS,
    PRIMARY_CTA,
    CONTRACT_SCOPE,
    path,
} from "@/data/renewal/site";

// HERO — The Contract.
//
// 인트로는 독립 풀스크린 시네마(IntroScreen.tsx, LAB Concept 01)가 담당한다.
// 이 섹션의 기본(서버 HTML + CSS) 상태가 곧 최종 상태 — 인트로가 걷히면
// 완성된 히어로가 그대로 드러난다. JS 실패/reduced-motion 이면 인트로 없이
// 바로 이 화면이다.

// 프리페인트 부트 — 파싱 중 실행되어 첫 페인트 전에 재생 여부를 정한다.
// 인트로 화면이므로 홈을 새로 열 때마다 재생한다(reduced-motion 만 제외).
const INTRO_BOOT =
    "(function(){try{var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;" +
    "if(!r){document.documentElement.setAttribute('data-intro','play');}}catch(e){}})()";

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
        <>
            <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
            {/* 섹션(mt-grid-bg)은 isolation: isolate 라 인트로가 안에 있으면
                헤더(z-50)에 덮인다 — 반드시 섹션 밖 형제로 둔다 */}
            <IntroScreen />
        <section data-clause="전문" className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
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
                                메이크디스원으로
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
        </>
    );
}
