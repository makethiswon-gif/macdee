import { Container, Button, Stat } from "../primitives";
import Reveal from "../Reveal";
import Logo from "../Logo";
import IntroScreen from "./IntroScreen";
import {
    HERO_OVERLINE,
    HERO_BODY,
    HERO_BEFORE,
    HERO_CARD_TITLE,
    HERO_CARD_ITEMS,
    HERO_CARD_FOOT,
    PROOF_STATS,
    PRIMARY_CTA,
    path,
} from "@/data/renewal/site";

// HERO — "필요한 전부, 한 팀".
//
// 첫 화면 5초 안에 "로펌 마케팅 전부를 한 팀이 운영한다"가 읽혀야 한다.
// 좌: 선언 + 한 줄 Before→After + CTA. 우: "메이크디스원이 맡는 일" 카드 —
// 여섯 영역이 차례로 켜지며(체크인 펄스) 한 팀 운영을 형태로 보여준다.
// 기본(서버 HTML + CSS) 상태가 곧 최종 상태 — JS/모션 없이도 전부 읽힌다.

// 프리페인트 부트 — 파싱 중 실행되어 첫 페인트 전에 재생 여부를 정한다.
// 같은 세션에서는 한 번만 재생한다(sessionStorage). reduced-motion 미재생.
// 앵커(#system·#plans 등)로 진입한 방문자는 목적지가 있다 — 인트로로 가로막지 않는다.
const INTRO_BOOT =
    "(function(){try{var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;" +
    "if(!r&&!location.hash&&!sessionStorage.getItem('renewalIntroSeen')){" +
    "document.documentElement.setAttribute('data-intro','play');" +
    "sessionStorage.setItem('renewalIntroSeen','1');}}catch(e){}})()";

function ScopeCard() {
    return (
        <aside className="mt-contract relative" aria-label={HERO_CARD_TITLE}>
            <p className="mt-label" style={{ color: "var(--mt-accent)", letterSpacing: "0.08em" }}>
                {HERO_CARD_TITLE}
            </p>

            <ul className="mt-5">
                {HERO_CARD_ITEMS.map((it, i) => (
                    <li
                        key={it.ko}
                        className="mt-scope-row flex items-center justify-between gap-4 py-[10px] text-[13px] font-medium"
                        style={{
                            borderTop: "1px solid var(--mt-line)",
                            color: "var(--mt-ink)",
                            ["--i" as string]: i,
                        }}
                    >
                        <span className="flex items-center gap-2.5">
                            {/* 체크인 점 — 차례로 파랗게 켜진다 */}
                            <span className="mt-scope-dot" aria-hidden />
                            {it.ko}
                        </span>
                        <span className="mt-en mt-num text-[9px]" style={{ color: "var(--mt-gray-light)" }}>
                            {it.no}
                        </span>
                    </li>
                ))}
            </ul>

            <div
                className="mt-6 pt-4 flex items-center justify-between gap-4"
                style={{ borderTop: "1px solid var(--mt-line-strong)" }}
            >
                <p className="text-[12.5px] font-medium" style={{ color: "var(--mt-ink)" }}>
                    {HERO_CARD_FOOT}
                </p>
                <Logo size={13} />
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
        <section data-clause="HOME" className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
            <Container>
                {/* lg 구간에서 카드 340px — 좌측 칼럼을 넓혀 "메이크디스원 하나로"가
                    한 줄에 들어가게 한다. xl 부터는 원래 400px */}
                <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:items-center">
                    {/* ── 좌측 — 선언 ── */}
                    <div>
                        <div className="mt-hero-in">
                            <span className="mt-en mt-label inline-block" style={{ color: "var(--mt-gray)" }}>
                                {HERO_OVERLINE}
                            </span>
                        </div>

                        {/* mt-display(최대 5.2rem)로는 "메이크디스원 하나로"(10자)가 칼럼에
                            물리적으로 안 들어가 브랜드명이 두 줄로 꺾인다 — 이 H1 만 크기를
                            보정해 모든 구간에서 온전한 줄로 유지. "필요한 모든 것."은 NBSP
                            한 덩어리라 좁아지면 통째로 내려간다(외톨이 줄 방지) */}
                        <h1
                            className="mt-serif mt-display mt-8 max-w-[32ch]"
                            style={{ lineHeight: 1.16, fontSize: "clamp(2.2rem, 4.6vw, 3.8rem)" }}
                        >
                            <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                                로펌 마케팅에 필요한&nbsp;모든&nbsp;것.
                            </span>
                            <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "120ms" }}>
                                메이크디스원 하나로
                            </span>
                        </h1>

                        <p
                            className="mt-hero-in mt-8 text-[15.5px] md:text-[16.5px] leading-[1.75] max-w-[560px]"
                            style={{ ["--mt-hero-delay" as string]: "220ms", color: "var(--mt-charcoal)" }}
                        >
                            {HERO_BODY}
                        </p>

                        {/* 한 줄 Before → After */}
                        <p
                            className="mt-hero-in mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px]"
                            style={{ ["--mt-hero-delay" as string]: "300ms" }}
                        >
                            <span style={{ color: "var(--mt-gray)" }}>
                                {HERO_BEFORE.map((b, i) => (
                                    <span key={b}>
                                        {i > 0 && <span aria-hidden> · </span>}
                                        <span className="line-through decoration-[1px]" style={{ textDecorationColor: "var(--mt-gray-light)" }}>
                                            {b}
                                        </span>
                                    </span>
                                ))}
                            </span>
                            <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                →
                            </span>
                            <span className="mt-en font-semibold" style={{ color: "var(--mt-ink)", letterSpacing: "0.04em" }}>
                                MAKETHIS1<span style={{ color: "var(--mt-accent)" }}>.</span>
                            </span>
                        </p>

                        <div className="mt-hero-in" style={{ ["--mt-hero-delay" as string]: "380ms" }}>
                            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                                <Button href={path(PRIMARY_CTA.href)} variant="primary">
                                    마케팅 진단받기 <span aria-hidden>→</span>
                                </Button>
                                <Button href={path("/#plans")} variant="outline">
                                    세 가지 운영안 보기
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── 우측 — 맡는 일 카드 ── */}
                    <div className="mt-12 lg:mt-0 max-w-[400px] lg:max-w-none">
                        <ScopeCard />
                        {/* 카드 아래에서 파란 실이 다음 섹션으로 이어진다 */}
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
