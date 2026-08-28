"use client";

import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { SYSTEM_STEPS } from "@/data/renewal/site";

// SECTION 02 — 발견부터 수임까지, 하나의 여정.
//
// 두 번째 강한 인터랙션.
// 이전에는 여섯 단계가 똑같은 리스트로 길게 늘어져 전부 동시에 보였다.
// 이제는 좌측 레일이 고정되고, 현재 단계만 높은 대비로 살아난다.
// 마지막 OPTIMIZATION 에서 선이 다시 위로 올라가 DISCOVERY 로 돌아간다.
//
// 데스크톱만 sticky. 구간은 단계당 약 78svh 로, 갇힌 느낌이 나지 않는 길이다.
// 모바일은 평범한 세로 타임라인이다.

const N = SYSTEM_STEPS.length;

export default function MarketingSystem() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section id="system" className="py-[88px] md:py-[140px]">
            <Container>
                <SectionHeader
                    number="제4조"
                    eyebrow="Marketing System"
                    serif
                    title="우리가 관리하는 것은 광고가 아닙니다."
                    lead="고객이 로펌을 처음 발견하는 순간부터 검색하고, 비교하고, 신뢰하고, 상담하고, 사건을 맡기기까지 — 그 전체 과정을 관리합니다. 각 단계를 다른 회사가 맡으면 사이가 비고, 그 사이에서 고객이 사라집니다."
                />
            </Container>

            {/* ── 데스크톱: 스크롤 내러티브 ── */}
            <div
                ref={stageRef}
                className="mt-stage mt-stage-track hidden lg:block mt-16"
                style={{ height: `${N * 78 + 40}svh`, ["--n" as string]: N }}
            >
                <div className="mt-stage-pin">
                    <Container>
                        <div className="grid grid-cols-[300px_1fr] gap-20">
                            {/* 좌측 여정 레일 */}
                            <div className="mt-rail relative pl-8">
                                <span
                                    className="absolute left-0 top-1 bottom-1 w-px"
                                    style={{ background: "var(--mt-line)" }}
                                />
                                {/* 진행선 */}
                                <span className="mt-rail-fill absolute left-0 top-1 w-px" />

                                <ol className="flex flex-col gap-7">
                                    {SYSTEM_STEPS.map((s, i) => (
                                        <li
                                            key={s.no}
                                            className="mt-rail-item relative"
                                            style={{ ["--i" as string]: i }}
                                        >
                                            <span className="mt-rail-dot absolute -left-8 top-1.5 w-[7px] h-[7px] -translate-x-[3px] rounded-full" />
                                            <p className="mt-en mt-num text-[10px] font-medium">{s.no}</p>
                                            <p className="mt-en text-[11.5px] font-medium mt-1.5">{s.en}</p>
                                        </li>
                                    ))}
                                </ol>

                                {/* 피드백 루프 — 마지막 단계에서 다시 처음으로 */}
                                <div className="mt-loop absolute -left-2 top-0 bottom-0 w-16 pointer-events-none">
                                    <svg
                                        className="w-full h-full overflow-visible"
                                        viewBox="0 0 64 100"
                                        preserveAspectRatio="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M 6 97 C -22 97, -22 3, 6 3"
                                            fill="none"
                                            stroke="var(--mt-accent)"
                                            strokeWidth="1"
                                            vectorEffect="non-scaling-stroke"
                                            strokeDasharray="1"
                                            pathLength={1}
                                        />
                                    </svg>
                                    <span className="mt-loop-label mt-en absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap text-[9px] font-medium">
                                        Feedback
                                    </span>
                                </div>
                            </div>

                            {/* 우측 본문 — 현재 단계만 살아난다 */}
                            <div className="relative min-h-[340px]">
                                {SYSTEM_STEPS.map((s, i) => (
                                    <article
                                        key={s.no}
                                        className="mt-step absolute inset-x-0 top-0"
                                        style={{ ["--i" as string]: i }}
                                    >
                                        <h3 className="mt-h2">{s.title}</h3>
                                        <p className="mt-body-lg mt-7 max-w-[560px]">{s.desc}</p>
                                        <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2 max-w-[560px]">
                                            {s.tags.map((t) => (
                                                <li
                                                    key={t}
                                                    className="mt-en text-[10.5px] font-medium"
                                                    style={{ color: "var(--mt-gray-light)" }}
                                                >
                                                    {t}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </Container>
                </div>
            </div>

            {/* ── 모바일: 세로 타임라인 ── */}
            <Container className="lg:hidden">
                <ol className="mt-12 relative pl-7">
                    <span
                        className="absolute left-0 top-2 bottom-8 w-px"
                        style={{ background: "var(--mt-line)" }}
                    />
                    {SYSTEM_STEPS.map((s, i) => (
                        <Reveal key={s.no} as="li" index={i % 3} className="relative pb-11">
                            <span
                                className="absolute -left-7 top-1.5 w-[7px] h-[7px] rounded-full -translate-x-[3px]"
                                style={{ background: "var(--mt-accent)" }}
                            />
                            <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                {s.no}
                            </p>
                            <p className="mt-en text-[11px] font-medium mt-1.5" style={{ color: "var(--mt-gray)" }}>
                                {s.en}
                            </p>
                            <h3 className="mt-h3 mt-3">{s.title}</h3>
                            <p className="mt-body mt-3">{s.desc}</p>
                        </Reveal>
                    ))}
                    <li className="relative">
                        <span
                            className="absolute -left-7 top-1.5 w-[7px] h-[7px] rounded-full -translate-x-[3px]"
                            style={{ border: "1px solid var(--mt-accent)" }}
                        />
                        <p className="mt-en text-[10.5px] font-medium" style={{ color: "var(--mt-accent)" }}>
                            Feedback
                        </p>
                        <p className="mt-body mt-2 text-[13px]">
                            마지막 단계의 데이터가 다시 첫 단계로 돌아갑니다.
                        </p>
                    </li>
                </ol>
            </Container>
        </section>
    );
}
