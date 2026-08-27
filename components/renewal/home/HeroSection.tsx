import { Container, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { HERO_CHANNELS, PRIMARY_CTA, path } from "@/data/renewal/site";

// SECTION 00 — 3초 안에 "무엇을 하는 회사인가"를 이해시킨다.
//
// 모션은 절제한다. H1 가독성이 효과보다 우선이다.
//   eyebrow → H1 첫 줄 → H1 둘째 줄 → sub → CTA 순으로 시차를 둔다.
//   H1 은 mask reveal — 글자가 아래에서 밀려 올라온다.
//   배경은 아주 옅은 격자만. 마우스 추적도 parallax 도 쓰지 않는다.
//
// LCP 요소는 H1 이다. 여기에 무거운 애니메이션을 걸지 않는다 —
// mask 는 transform 하나뿐이고 이미지도 없다.

export default function HeroSection() {
    return (
        <section className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
            <Container>
                <Reveal variant="rise">
                    <Eyebrow>Law Firm Marketing Department</Eyebrow>
                </Reveal>

                <h1 className="mt-display mt-8 max-w-[16ch]">
                    <Reveal variant="mask" index={1} stagger={110}>
                        로펌 마케팅,
                    </Reveal>
                    <Reveal variant="mask" index={2} stagger={110}>
                        여기서 끝냅니다.
                    </Reveal>
                </h1>

                <Reveal variant="rise" index={4} stagger={90}>
                    <p className="mt-body-lg mt-10 max-w-[560px]">
                        네이버 파워링크부터 Google Ads, 네이버 블로그와 홈페이지, SEO·GEO,
                        AI 검색과 상담 전환 분석까지.
                        <br className="hidden sm:block" />
                        <strong className="font-semibold" style={{ color: "var(--mt-ink)" }}>
                            MAKETHIS1이 하나의 마케팅팀처럼 전부 운영합니다.
                        </strong>
                    </p>
                </Reveal>

                <Reveal variant="rise" index={5} stagger={90}>
                    <div className="mt-12 flex flex-col sm:flex-row gap-3">
                        <Button href={path(PRIMARY_CTA.href)} variant="primary">
                            우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                        </Button>
                        <Button href={path("/#system")} variant="outline">
                            운영 시스템 보기
                        </Button>
                    </div>
                </Reveal>
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
