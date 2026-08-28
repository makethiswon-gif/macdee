"use client";

import { Container, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { LEAD_TO_CASE, path } from "@/data/renewal/site";

// SECTION 03 — Lead to Case.
//
// 세 번째이자 가장 중요한 인터랙션. MAKETHIS1 의 차별화가 여기 있다.
//
// 흐름
//   광고 · 검색 · 콘텐츠 · 홈페이지 (서로 다른 입력)
//     → 하나의 유입으로 합류
//       → 전화 · 카카오 · 폼 으로 분기
//         → 상담 → 유효 상담 → 수임
//           → 수임 데이터가 다시 예산 · 키워드 · 콘텐츠 · 랜딩으로 회귀
//
// 숫자를 넣지 않는다. 대시보드 UI 를 흉내 내지 않는다.
// 좌표계는 1000×420 고정 viewBox 라 어떤 폭에서도 비율이 유지된다.

const INPUTS = ["광고", "검색", "콘텐츠", "홈페이지"];
const LEADS = ["전화", "카카오", "폼"];
const RETURNS = ["예산", "키워드", "콘텐츠", "랜딩"];

// y 좌표 (viewBox 420 기준)
const inY = (i: number) => 58 + i * 68;
const leadY = (i: number) => 126 + i * 84;

export default function LeadToCase() {
    const stageRef = useScrollProgress<HTMLDivElement>("enter");
    const { en, title, lead, points, href } = LEAD_TO_CASE;

    return (
        <section
            className="mt-dark-glow py-[88px] md:py-[140px]"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <Container>
                <SectionHeader number="제5조" eyebrow={en} serif title={title} lead={lead} />
            </Container>

            {/* ── 데이터 흐름 ── */}
            <div ref={stageRef} className="mt-stage mt-flow mt-14 md:mt-20">
                <Container>
                    {/* 데스크톱 · 태블릿: 가로 흐름 */}
                    <div className="hidden md:block">
                        <svg
                            viewBox="0 0 1000 420"
                            className="w-full h-auto overflow-visible"
                            role="img"
                            aria-label="광고·검색·콘텐츠·홈페이지 유입이 하나로 합쳐져 전화·카카오·폼으로 분기하고, 상담과 유효 상담을 거쳐 수임으로 이어지며, 수임 데이터가 다시 예산·키워드·콘텐츠·랜딩 전략으로 돌아가는 흐름"
                        >
                            {/* 1) 입력 → 합류점 */}
                            <g className="mt-flow-g" style={{ ["--s" as string]: 0 }}>
                                {INPUTS.map((_, i) => (
                                    <path
                                        key={i}
                                        d={`M 150 ${inY(i)} C 240 ${inY(i)}, 230 210, 300 210`}
                                        fill="none"
                                        stroke="var(--mt-dark-gray)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                    />
                                ))}
                            </g>

                            {/* 2) 합류점 → 분기 */}
                            <g className="mt-flow-g" style={{ ["--s" as string]: 1 }}>
                                {LEADS.map((_, i) => (
                                    <path
                                        key={i}
                                        d={`M 360 210 C 430 210, 420 ${leadY(i)}, 490 ${leadY(i)}`}
                                        fill="none"
                                        stroke="var(--mt-dark-gray)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                    />
                                ))}
                            </g>

                            {/* 3) 분기 → 상담 */}
                            <g className="mt-flow-g" style={{ ["--s" as string]: 2 }}>
                                {LEADS.map((_, i) => (
                                    <path
                                        key={i}
                                        d={`M 578 ${leadY(i)} C 640 ${leadY(i)}, 630 210, 700 210`}
                                        fill="none"
                                        stroke="var(--mt-dark-gray)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                    />
                                ))}
                            </g>

                            {/* 4) 상담 → 수임 */}
                            <g className="mt-flow-g" style={{ ["--s" as string]: 3 }}>
                                <path
                                    d="M 790 210 L 866 210"
                                    fill="none"
                                    stroke="var(--mt-accent)"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                    pathLength={1}
                                />
                            </g>

                            {/* 5) 수임 → 전략 회귀 */}
                            <g className="mt-flow-g mt-flow-return" style={{ ["--s" as string]: 4 }}>
                                <path
                                    d="M 934 262 C 934 372, 700 386, 420 386 C 220 386, 96 372, 96 300 L 96 118"
                                    fill="none"
                                    stroke="var(--mt-accent)"
                                    strokeWidth="1.5"
                                    strokeDasharray="1"
                                    vectorEffect="non-scaling-stroke"
                                    pathLength={1}
                                />
                            </g>

                            {/* 노드 — 입력 */}
                            {INPUTS.map((t, i) => (
                                <g key={t} className="mt-flow-node" style={{ ["--s" as string]: 0, ["--i" as string]: i }}>
                                    <rect x="30" y={inY(i) - 19} width="120" height="38" rx="2" fill="var(--mt-dark-bg)" stroke="var(--mt-line)" />
                                    <text x="90" y={inY(i) + 5} textAnchor="middle" className="mt-flow-t">{t}</text>
                                </g>
                            ))}

                            {/* 노드 — 합류 */}
                            <g className="mt-flow-node" style={{ ["--s" as string]: 1, ["--i" as string]: 0 }}>
                                <rect x="300" y="186" width="60" height="48" rx="2" fill="var(--mt-dark-bg)" stroke="var(--mt-line)" />
                                <text x="330" y="215" textAnchor="middle" className="mt-flow-t mt-flow-t-en">VISIT</text>
                            </g>

                            {/* 노드 — 분기 */}
                            {LEADS.map((t, i) => (
                                <g key={t} className="mt-flow-node" style={{ ["--s" as string]: 2, ["--i" as string]: i }}>
                                    <rect x="490" y={leadY(i) - 19} width="88" height="38" rx="2" fill="var(--mt-dark-bg)" stroke="var(--mt-line)" />
                                    <text x="534" y={leadY(i) + 5} textAnchor="middle" className="mt-flow-t">{t}</text>
                                </g>
                            ))}

                            {/* 노드 — 상담 */}
                            <g className="mt-flow-node" style={{ ["--s" as string]: 3, ["--i" as string]: 0 }}>
                                <rect x="700" y="184" width="90" height="52" rx="2" fill="var(--mt-dark-bg)" stroke="var(--mt-line)" />
                                <text x="745" y="206" textAnchor="middle" className="mt-flow-t">상담</text>
                                <text x="745" y="224" textAnchor="middle" className="mt-flow-t mt-flow-t-sm">유효 상담</text>
                            </g>

                            {/* 노드 — 수임 */}
                            <g className="mt-flow-node mt-flow-case" style={{ ["--s" as string]: 4, ["--i" as string]: 0 }}>
                                <rect x="866" y="182" width="136" height="56" rx="2" fill="var(--mt-dark-bg)" stroke="var(--mt-accent)" strokeWidth="1.5" />
                                <text x="934" y="207" textAnchor="middle" className="mt-flow-t mt-flow-t-lg">수임</text>
                                <text x="934" y="226" textAnchor="middle" className="mt-flow-t mt-flow-t-en mt-flow-t-sm">CASE</text>
                            </g>

                            {/* 회귀 라벨 */}
                            <g className="mt-flow-node" style={{ ["--s" as string]: 5, ["--i" as string]: 0 }}>
                                <text x="420" y="378" textAnchor="middle" className="mt-flow-t mt-flow-t-sm mt-flow-t-accent">
                                    {RETURNS.join("  ·  ")} 로 되돌아갑니다
                                </text>
                            </g>
                        </svg>
                    </div>

                    {/* 모바일: 세로 흐름 */}
                    <ol className="md:hidden flex flex-col gap-3">
                        {[
                            { k: "IN", t: INPUTS.join(" · "), s: "서로 다른 입력" },
                            { k: "VISIT", t: "유입", s: "하나로 합류" },
                            { k: "LEAD", t: LEADS.join(" · "), s: "상담 경로로 분기" },
                            { k: "CONSULT", t: "상담 · 유효 상담", s: "" },
                            { k: "CASE", t: "수임", s: "" },
                            { k: "LOOP", t: RETURNS.join(" · "), s: "데이터가 다시 전략으로" },
                        ].map((r, i, arr) => (
                            <Reveal key={r.k} as="li" index={i} stagger={90}>
                                <div
                                    className="px-5 py-5"
                                    style={{
                                        border: `1px solid ${i >= 4 ? "var(--mt-accent)" : "var(--mt-line)"}`,
                                    }}
                                >
                                    <p className="mt-en mt-label" style={{ color: i >= 4 ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                                        {r.k}
                                    </p>
                                    <p className="mt-3 text-[15px]" style={{ color: "var(--mt-bg)" }}>{r.t}</p>
                                    {r.s && <p className="mt-body mt-1.5 text-[12.5px]">{r.s}</p>}
                                </div>
                                {i < arr.length - 1 && (
                                    <span
                                        className="block w-px h-4 mx-auto my-1"
                                        style={{ background: "var(--mt-dark-gray)" }}
                                    />
                                )}
                            </Reveal>
                        ))}
                    </ol>
                </Container>
            </div>

            <Container>
                <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-20 lg:items-end">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        {points.map((p, i) => (
                            <Reveal key={p} as="li" index={i % 2}>
                                <div className="py-5" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                    <p className="text-[14.5px] leading-[1.7]" style={{ color: "var(--mt-bg)" }}>
                                        {p}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </ul>

                    <Reveal>
                        <div className="shrink-0">
                            <ArrowLink href={path(href)}>
                                <span style={{ color: "var(--mt-bg)" }}>데이터 운영 방식 보기</span>
                            </ArrowLink>
                        </div>
                    </Reveal>
                </div>
            </Container>
        </section>
    );
}
