"use client";

import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { SCATTERED_AGENCIES } from "@/data/renewal/site";

// SECTION 01 — 흩어진 대행사가 MAKETHIS1 하나로 수렴한다.
//
// 이 페이지의 세 개뿐인 강한 인터랙션 중 첫 번째.
// 스크롤이 진행되면 여섯 블록이 중앙으로 모이고, 선이 그어지고,
// 마지막에 "전략 · 제작 · 집행 · 분석" 한 줄로 정리된다.
//
// 구현
//  - JS 는 useScrollProgress 가 --p (0→1) 를 쓰는 것뿐. 나머지는 CSS transform.
//  - 각 블록은 자기 좌표(--x, --y)를 인라인으로 갖고 --p 로 0 까지 당겨진다.
//  - 데스크톱만 sticky. 모바일은 트랙 높이를 0 으로 두고 세로로 흐른다.
//
// 3D·네온·파티클 없음. 선과 위치 이동만 쓴다.

const OUTPUT = ["전략", "제작", "집행", "분석"];

// 3열 그리드에서 각 블록이 출발할 상대 위치(%). 중앙이 0,0.
const ORIGIN: { x: number; y: number }[] = [
    { x: -104, y: -62 },
    { x: 0, y: -78 },
    { x: 104, y: -62 },
    { x: -104, y: 62 },
    { x: 0, y: 78 },
    { x: 104, y: 62 },
];

export default function ProblemSection() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section
            className="mt-dark-glow"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <Container className="pt-[88px] md:pt-[140px]">
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
            </Container>

            {/* 무대 — 데스크톱에서는 이 높이만큼 스크롤하며 수렴이 진행된다 */}
            <div ref={stageRef} className="mt-stage mt-stage-track mt-16 md:mt-0 lg:h-[260svh]">
                <div className="mt-stage-pin">
                    <Container>
                        {/* ── 모바일: 세로 목록 → 화살표 → 통합 ── */}
                        <div className="lg:hidden">
                            <ul className="grid grid-cols-2 gap-px" style={{ background: "var(--mt-line)" }}>
                                {SCATTERED_AGENCIES.map((a, i) => (
                                    <Reveal key={a.channel} as="li" index={i} stagger={60}>
                                        <div className="px-5 py-7 h-full" style={{ background: "var(--mt-dark-bg)" }}>
                                            <p className="mt-en mt-label" style={{ color: "var(--mt-bg)" }}>
                                                {a.channel}
                                            </p>
                                            <p className="mt-body mt-2.5 text-[12.5px]">{a.agency}</p>
                                        </div>
                                    </Reveal>
                                ))}
                            </ul>

                            <Reveal variant="line" className="block mx-auto mt-10 w-px h-14" >
                                <span
                                    className="block w-px h-14"
                                    style={{ background: "var(--mt-dark-gray)" }}
                                />
                            </Reveal>

                            <Reveal index={1}>
                                <div
                                    className="mt-10 px-8 py-9 text-center"
                                    style={{ border: "1px solid var(--mt-bg)" }}
                                >
                                    <p
                                        className="mt-en text-[15px] font-semibold"
                                        style={{ color: "var(--mt-bg)", letterSpacing: "0.08em" }}
                                    >
                                        MAKETHIS1
                                    </p>
                                    <p className="mt-body mt-3 text-[12.5px]">
                                        {OUTPUT.join(" · ")}
                                    </p>
                                </div>
                            </Reveal>
                        </div>

                        {/* ── 데스크톱: 스크롤 수렴 ── */}
                        <div className="hidden lg:block relative h-[62svh] mt-conv">
                            {/* 선 — 각 블록 자리에서 중앙으로. --p 로 그려진다 */}
                            <svg
                                className="absolute inset-0 w-full h-full mt-conv-lines"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                {ORIGIN.map((o, i) => (
                                    <line
                                        key={i}
                                        x1={50 + o.x * 0.32}
                                        y1={50 + o.y * 0.32}
                                        x2="50"
                                        y2="50"
                                        stroke="var(--mt-dark-gray)"
                                        strokeWidth="0.5"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                    />
                                ))}
                            </svg>

                            {/* 여섯 블록 */}
                            {SCATTERED_AGENCIES.map((a, i) => (
                                <div
                                    key={a.channel}
                                    className="mt-conv-node absolute left-1/2 top-1/2 w-[188px] -ml-[94px] -mt-[46px] px-5 py-4"
                                    style={{
                                        ["--x" as string]: `${ORIGIN[i].x}%`,
                                        ["--y" as string]: `${ORIGIN[i].y}%`,
                                        ["--i" as string]: i,
                                        background: "var(--mt-dark-bg)",
                                        border: "1px solid var(--mt-line)",
                                    }}
                                >
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-bg)" }}>
                                        {a.channel}
                                    </p>
                                    <p className="mt-body mt-2 text-[12px]">{a.agency}</p>
                                </div>
                            ))}

                            {/* 통합체 */}
                            <div className="mt-conv-core absolute left-1/2 top-1/2 w-[440px] -ml-[220px] -mt-[62px] px-10 py-9 text-center">
                                <p
                                    className="mt-en text-[17px] font-semibold"
                                    style={{ color: "var(--mt-bg)", letterSpacing: "0.1em" }}
                                >
                                    MAKETHIS1
                                </p>
                                <ul className="mt-conv-out mt-5 flex items-center justify-center gap-3">
                                    {OUTPUT.map((o, i) => (
                                        <li
                                            key={o}
                                            style={{ ["--i" as string]: i }}
                                            className="flex items-center gap-3 text-[13px]"
                                        >
                                            <span style={{ color: "var(--mt-bg)" }}>{o}</span>
                                            {i < OUTPUT.length - 1 && (
                                                <span style={{ color: "var(--mt-dark-gray)" }}>·</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Container>
                </div>
            </div>

            <Container className="pb-[88px] md:pb-[140px] pt-16 md:pt-24">
                <Reveal>
                    <p className="mt-body-lg max-w-[620px]">
                        광고대행사, 블로그 업체, 홈페이지 업체, SEO 업체를 따로 관리할 필요가 없습니다.
                        <br className="hidden sm:block" />
                        <strong className="font-semibold" style={{ color: "var(--mt-bg)" }}>
                            전략부터 제작, 집행, 분석까지 전부 저희가 합니다.
                        </strong>
                    </p>
                </Reveal>
            </Container>
        </section>
    );
}
