"use client";

import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { BEFORE_AFTER } from "@/data/renewal/site";

// 제3조 — 맡기기 전 / 맡긴 후 (ONE BLUE THREAD 짧은 전환).
//
// 스크롤 전반부: 업체·보고서·연락 창구 조각이 서로 다른 위치와 각도로 흩어져 있다.
// 후반부: 조각이 사라지며 하나의 기준선(하나의 창구 · 하나의 성과표 · ONE STRATEGY)
// 으로 정렬된다 — 페이지 공통 언어인 "문서 정렬" 모션이다.
// enter 진행(--p) 기반이라 sticky 없음, 역스크롤 역재생, 이탈 후 최종 상태.
// 모바일은 조각 무대를 생략하고 문장과 정렬 결과만 보여준다(겹침 방지).

const SCATTER = [
    { label: "광고대행사", sx: -270, sy: -34, sr: -5 },
    { label: "블로그 업체", sx: -90, sy: -52, sr: 4 },
    { label: "홈페이지 제작사", sx: 96, sy: -30, sr: -3 },
    { label: "SEO 업체", sx: 250, sy: -48, sr: 5 },
    { label: "보고서 4건", sx: -180, sy: 30, sr: 6 },
    { label: "연락 창구 5개", sx: 150, sy: 38, sr: -6 },
];

const ALIGNED = ["하나의 창구", "하나의 성과표", "ONE STRATEGY"];

function Column({
    label,
    items,
    accent = false,
    index = 0,
}: {
    label: string;
    items: string[];
    accent?: boolean;
    index?: number;
}) {
    return (
        <Reveal index={index}>
            <div
                className="h-full px-7 py-9 md:px-9 md:py-11"
                style={{
                    background: "var(--mt-dark-bg)",
                    border: `1px solid ${accent ? "var(--mt-accent)" : "var(--mt-line)"}`,
                }}
            >
                <p className="mt-en mt-label" style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                    {label}
                </p>
                <ul className="mt-7 flex flex-col gap-5">
                    {items.map((it) => (
                        <li key={it} className="flex gap-3 text-[14.5px] leading-[1.7]">
                            <span aria-hidden style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                                {accent ? "―" : "×"}
                            </span>
                            <span style={{ color: accent ? "var(--mt-bg)" : "var(--mt-gray)" }}>{it}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Reveal>
    );
}

export default function ProblemSection() {
    const stageRef = useScrollProgress<HTMLDivElement>("enter");

    return (
        <section
            data-clause="제3조"
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
            <div ref={stageRef} className="mt-stage">
                <Container>
                    <SectionHeader
                        number="제3조"
                        eyebrow="Before · After"
                        serif
                        title={
                            <>
                                파워링크, 블로그, 홈페이지, SEO —
                                <br />
                                왜 전부 다른 업체입니까?
                            </>
                        }
                    />

                    {/* ── 문서 정렬 무대 (데스크톱) ── */}
                    <div className="hidden lg:block relative h-[190px] mt-12" aria-hidden="true">
                        {SCATTER.map((c, i) => (
                            <span
                                key={c.label}
                                className="mt-bchip absolute left-1/2 top-1/2 -ml-16 -mt-4 w-32 text-center px-2 py-[6px] text-[12px] rounded-[2px]"
                                style={{
                                    background: "var(--mt-dark-bg)",
                                    border: "1px solid var(--mt-line)",
                                    color: "var(--mt-gray)",
                                    ["--sx" as string]: `${c.sx}px`,
                                    ["--sy" as string]: `${c.sy}px`,
                                    ["--sr" as string]: `${c.sr}deg`,
                                    ["--a" as string]: 0.06 + i * 0.04,
                                }}
                            >
                                {c.label}
                            </span>
                        ))}
                        {/* 정렬 결과 — 하나의 기준선 */}
                        <div className="mt-pi absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3"
                            style={{ ["--a" as string]: 0.52, ["--w" as string]: 0.1 }}
                        >
                            {ALIGNED.map((r) => (
                                <span
                                    key={r}
                                    className="px-4 py-[7px] text-[12.5px] font-medium rounded-[2px] whitespace-nowrap"
                                    style={{
                                        border: "1px solid var(--mt-accent)",
                                        color: "var(--mt-accent)",
                                        background: "var(--mt-dark-bg)",
                                    }}
                                >
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 전환 문장 */}
                    <p
                        className="mt-pi mt-10 lg:mt-6 text-center mt-serif text-[clamp(1.05rem,1.8vw,1.35rem)] font-semibold leading-[1.7]"
                        style={{ color: "var(--mt-bg)", ["--a" as string]: 0.4, ["--w" as string]: 0.12 }}
                    >
                        여러 업체를 관리하던 구조에서
                        <br className="sm:hidden" /> 하나의 팀이 운영하는 구조로.
                    </p>

                    <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Column label={BEFORE_AFTER.before.label} items={BEFORE_AFTER.before.items} />
                        <Column label={BEFORE_AFTER.after.label} items={BEFORE_AFTER.after.items} accent index={1} />
                    </div>
                </Container>
            </div>
        </section>
    );
}
