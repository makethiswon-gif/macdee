"use client";

import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { BEFORE_AFTER } from "@/data/renewal/site";

// 맡기기 전 / 메이크디스원과 일하면 (LAB Concept 01 수렴 시네마 이식).
//
// 흩어져 표류하던 업체 조각들이 스크롤 진행(--p)에 따라 궤도로 끌려 들어오고,
// 파란 선으로 이어진 뒤, 하나의 파란 점(MAKETHIS1)으로 붕괴한다.
// EVERYTHING → ONE — 이 섹션의 서사(여러 업체 → 하나의 팀) 그 자체다.
//
// 구현: 캔버스는 장식(aria-hidden). 모든 상태가 --p 의 함수라 역스크롤 역재생,
// 빠른 스크롤 즉시 반영, 이탈 후 최종 상태(점 + MAKETHIS1) 유지.
// reduced-motion / JS 실패: --p=1 → 최종 프레임 / 캔버스 미표시. 카피는 DOM 텍스트.
// rAF 는 화면에 보일 때만 돈다(IntersectionObserver).

const VENDORS = ["광고대행사", "블로그 업체", "홈페이지 제작사", "SEO 업체", "보고서 4건", "연락 창구 5개"];
const RESULTS = ["담당 창구 하나", "운영 계획 하나", "성과표 하나"];

// Scroll-driven geometry only: no canvas, clock, or background RAF loop.
function ConvergenceGraphic() {
    return <div className="mt-k-convergence" aria-hidden="true">
        <div className="mt-k-fragments">{VENDORS.map((word, i) => <span key={word} style={{ "--i": i } as React.CSSProperties}>{word}</span>)}</div>
        <svg viewBox="0 0 1200 150" className="mt-k-one" focusable="false"><text x="0" y="120" textLength="1190" lengthAdjust="spacingAndGlyphs">MAKETHIS1.</text></svg>
        <div className="mt-k-results">{RESULTS.map(word => <span key={word}>{word}</span>)}</div>
    </div>;
}

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
            data-clause="BEFORE · AFTER"
            className="mt-k-before mt-dark-glow py-[88px] md:py-[140px]"
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
                        eyebrow="Before · After"
                        serif
                        title={BEFORE_AFTER.title.map((line, i) => (
                            <span key={line} className={i > 0 ? "block" : undefined}>
                                {line}
                            </span>
                        ))}
                    />

                    {/* ── ONE 수렴 시네마 ── */}
                    <div className="mt-6">
                        <ConvergenceGraphic />
                    </div>

                    <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Column label={BEFORE_AFTER.before.label} items={BEFORE_AFTER.before.items} />
                        <Column label={BEFORE_AFTER.after.label} items={BEFORE_AFTER.after.items} accent index={1} />
                    </div>
                </Container>
            </div>
        </section>
    );
}
