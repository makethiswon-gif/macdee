import { Container, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { HERO_CHANNELS, PRIMARY_CTA, path } from "@/data/renewal/site";

// SECTION 00 — 3초 안에 "무엇을 하는 회사인가"를 이해시킨다.
//
// 핵심(H1·설명·CTA)은 JS hydration 과 IntersectionObserver 를 기다리지 않는다.
//   예전에는 Reveal(mask/rise) 로 감싸 data-in 이 붙어야 보였고,
//   느린 기기에서 헤더·격자만 뜬 채 핵심 가치 제안이 ~1.2s 늦게 나타났다.
//   지금은 최초 HTML/CSS 상태에서 그대로 읽히고, mt-hero-in 이 transform 만
//   아주 짧게 움직인다(opacity 0 없음 → LCP 후보 H1 이 지연되지 않는다).
//
// eyebrow → H1 두 줄 → 설명 → CTA 순으로 미세한 시차만 준다.
// 규칙선·채널 marquee 같은 비핵심 장식은 기존 Reveal 스크롤 모션을 유지한다.

export default function HeroSection() {
    return (
        <section className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
            <Container>
                <div className="mt-hero-in">
                    <Eyebrow>Law Firm Marketing Department</Eyebrow>
                </div>

                <h1 className="mt-display mt-8 max-w-[16ch]">
                    <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "60ms" }}>
                        로펌 마케팅,
                    </span>
                    <span className="mt-hero-in block" style={{ ["--mt-hero-delay" as string]: "120ms" }}>
                        여기서 끝냅니다.
                    </span>
                </h1>

                <div className="mt-hero-in" style={{ ["--mt-hero-delay" as string]: "180ms" }}>
                    <p className="mt-body-lg mt-10 max-w-[560px]">
                        네이버 파워링크부터 Google Ads, 네이버 블로그와 홈페이지, SEO·GEO,
                        AI 검색과 상담 전환 분석까지.
                        <br className="hidden sm:block" />
                        <strong className="font-semibold" style={{ color: "var(--mt-ink)" }}>
                            로펌에 필요한 마케팅은 MAKETHIS1이 전부 해결합니다.
                        </strong>
                    </p>
                </div>

                <div className="mt-hero-in" style={{ ["--mt-hero-delay" as string]: "240ms" }}>
                    <div className="mt-12 flex flex-col sm:flex-row gap-3">
                        <Button href={path(PRIMARY_CTA.href)} variant="primary">
                            우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                        </Button>
                        <Button href={path("/#system")} variant="outline">
                            운영 시스템 보기
                        </Button>
                    </div>
                </div>
            </Container>

            {/* 채널 표기 — 로고를 늘어놓지 않는다. 느리게 흐르는 텍스트 한 줄. */}
            <div className="mt-20 md:mt-28">
                <Container>
                    <Reveal variant="line" index={6} stagger={90}>
                        <span className="block h-px w-full" style={{ background: "var(--mt-line)" }} />
                    </Reveal>
                </Container>

                <Reveal variant="fade" index={7} stagger={90}>
                    <div className="mt-marquee mt-8" aria-label={HERO_CHANNELS.join(", ")}>
                        <div className="mt-marquee-track">
                            {[0, 1].map((dup) => (
                                <ul key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                                    {HERO_CHANNELS.map((c) => (
                                        <li
                                            key={c}
                                            className="mt-en text-[11px] font-medium px-7 md:px-10"
                                            style={{ color: "var(--mt-gray-light)" }}
                                        >
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            ))}
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
