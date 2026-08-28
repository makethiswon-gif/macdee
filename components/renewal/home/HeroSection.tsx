import { Container, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { HERO_CHANNELS, HERO_QUESTIONS, HERO_ANSWER, PRIMARY_CTA, path } from "@/data/renewal/site";

// HERO — The Contract 개편.
//
// 3초 안에 두 가지를 전달한다: 선언("이제 한 곳이면 됩니다")과
// 그 근거가 되는 현재 상태(다섯 업체에 나뉜 발주)의 부정(취소선).
//
// 핵심(H1·질문·CTA)은 JS hydration 과 IntersectionObserver 를 기다리지 않는다.
// mt-hero-in 은 transform 만 움직이고(opacity 0 없음 → LCP H1 지연 없음),
// 취소선은 CSS 애니메이션이라 JS 실패와 무관하게 항상 완료 상태에 도달한다.
//
// H1 은 세리프(mt-serif) — 법률 문서의 권위. 본문은 그대로 Pretendard.

export default function HeroSection() {
    return (
        <section className="mt-grid-bg relative pt-[124px] md:pt-[164px] pb-14 md:pb-20 min-h-[86svh] flex flex-col justify-center">
            <Container>
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

                {/* 질문 취소선 — 마지막 줄의 답만 잉크 색으로 남는다 */}
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
                        className="mt-hero-in mt-3 text-[16px] md:text-[17px] font-semibold"
                        style={{
                            ["--mt-hero-delay" as string]: "580ms",
                            color: "var(--mt-ink)",
                        }}
                    >
                        {HERO_ANSWER}
                    </li>
                </ul>

                <div className="mt-hero-in" style={{ ["--mt-hero-delay" as string]: "660ms" }}>
                    <div className="mt-12 flex flex-col sm:flex-row gap-3">
                        <Button href={path(PRIMARY_CTA.href)} variant="primary">
                            우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                        </Button>
                        <Button href={path("/#scope")} variant="outline">
                            계약 범위 보기
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
