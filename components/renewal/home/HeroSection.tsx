import { Container, Button, Eyebrow, Stat } from "../primitives";
import Reveal from "../Reveal";
import { HERO_QUESTIONS, HERO_RESULT, PROOF_STATS, PRIMARY_CTA, path } from "@/data/renewal/site";

// HERO — The Contract / 의뢰인 여정 개편.
//
// 첫 화면에서 세 가지가 끝난다:
//   선언(H1) · 결과("의뢰인이 찾고, 믿고, 상담하도록") · 검증 수치(20+/100+/7년+).
// 채널 marquee 는 뺐다 — 채널 열거는 별지(제4조)의 일이고,
// 첫 화면의 근거 자리는 이미 공표된 수치가 맡는다(§42).
//
// 핵심(H1·질문·CTA)은 JS hydration 과 IntersectionObserver 를 기다리지 않는다.
// mt-hero-in 은 transform 만 움직이고(opacity 0 없음 → LCP H1 지연 없음),
// 취소선은 CSS 애니메이션이라 JS 실패와 무관하게 항상 완료 상태에 도달한다.

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

                {/* 질문 취소선 — 지금까지의 분산 발주가 지워진다 */}
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
            </Container>

            {/* 검증 근거 — 이미 대외 공표 중인 수치만(§42). 첫 화면 안에서 보인다. */}
            <div className="mt-16 md:mt-24">
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
