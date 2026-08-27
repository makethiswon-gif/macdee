import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { SCATTERED_AGENCIES } from "@/data/renewal/site";

// SECTION 02 — 흩어진 대행사들이 MAKETHIS1 하나로 수렴한다.
// 이 페이지에서 유일하게 허용한 "연출"이다(§18). 나머지는 전부 페이드뿐.
//
// 선 애니메이션은 SVG stroke-dashoffset + CSS로만 처리한다.
// preserveAspectRatio="none"이라 좌우로 늘어나도 6갈래가 카드 열과 정확히 맞는다.

export default function ProblemSection() {
    // 6개 카드 열의 중심 x좌표(0~100 스케일). 3열 그리드 기준 = 16.67 / 50 / 83.33
    const columns = [16.67, 50, 83.33];

    return (
        <Section dark>
            <Container>
                <SectionHeader
                    number="01"
                    eyebrow="The Problem"
                    title={
                        <>
                            마케팅 업체가 많아질수록
                            <br />
                            마케팅은 더 복잡해집니다.
                        </>
                    }
                />

                <div className="mt-16 md:mt-24">
                    {/* ── 흩어진 대행사 ── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: "var(--mt-line)" }}>
                        {SCATTERED_AGENCIES.map((a, i) => (
                            <Reveal key={a.channel} index={i}>
                                <div
                                    className="px-6 py-8 md:px-8 md:py-10 h-full"
                                    style={{ background: "var(--mt-dark-bg)" }}
                                >
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-bg)" }}>
                                        {a.channel}
                                    </p>
                                    <p className="mt-body mt-3 text-[13px]">{a.agency}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>

                    {/* ── 수렴 ── */}
                    <Reveal className="block mt-converge">
                        <svg
                            viewBox="0 0 100 40"
                            preserveAspectRatio="none"
                            className="w-full h-[80px] md:h-[120px]"
                            aria-hidden="true"
                        >
                            {columns.map((x, i) => (
                                <path
                                    key={x}
                                    d={`M ${x} 0 C ${x} 20, 50 20, 50 40`}
                                    fill="none"
                                    stroke="var(--mt-dark-gray)"
                                    strokeWidth="0.35"
                                    vectorEffect="non-scaling-stroke"
                                    style={{ animationDelay: `${i * 120}ms` }}
                                />
                            ))}
                        </svg>
                    </Reveal>

                    {/* ── 하나로 ── */}
                    <Reveal index={2}>
                        <div
                            className="mx-auto max-w-[520px] px-8 py-10 text-center"
                            style={{ border: "1px solid var(--mt-bg)" }}
                        >
                            <p
                                className="mt-en text-[15px] md:text-[17px] font-semibold"
                                style={{ color: "var(--mt-bg)", letterSpacing: "0.08em" }}
                            >
                                MAKETHIS1
                            </p>
                            <p className="mt-body mt-3 text-[13px]">전략 · 제작 · 집행 · 분석</p>
                        </div>
                    </Reveal>
                </div>

                <Reveal index={3}>
                    <p className="mt-body-lg mt-16 md:mt-20 max-w-[620px]">
                        광고대행사, 블로그 업체, 홈페이지 업체, SEO 업체를 따로 관리할 필요가 없습니다.
                        <br className="hidden sm:block" />
                        <strong className="font-semibold" style={{ color: "var(--mt-bg)" }}>
                            전략부터 제작, 집행, 분석까지 하나의 팀에서 관리합니다.
                        </strong>
                    </p>
                </Reveal>
            </Container>
        </Section>
    );
}
