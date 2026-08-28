"use client";

import Link from "next/link";
import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { CONTRACT_SCOPE, path } from "@/data/renewal/site";

// 제1조 — 계약 범위 (ONE BLUE THREAD 핵심 스크롤 이벤트).
//
// 닫힌 계약 문서(헤더)에서 시작해, 스크롤 진행에 따라 여섯 별지가
// 순차적으로 펼쳐진다: 번호 → 상단 선 그리기 → 품목 순차 → 조건부 배지.
// 전부 --p 의 순수 함수 — 역스크롤 역재생, 이탈 후 최종 상태 유지.
// 데스크톱만 짧은 sticky(185svh). 모바일은 세로 흐름에서 enter 진행.
// CTA 는 처음부터 클릭 가능하고(접근성) 시각적 강조만 뒤에 붙는다.

function Badge({ children }: { children: string }) {
    return (
        <span
            className="mt-en inline-block align-middle ml-1.5 px-1.5 pt-[3px] pb-[2px] text-[9px] font-medium rounded-[2px]"
            style={{ border: "1px solid var(--mt-line-strong)", color: "var(--mt-gray)" }}
        >
            {children}
        </span>
    );
}

export default function ContractScope() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section id="scope" data-clause="제1조" className="pt-[88px] md:pt-[140px] pb-[88px] md:pb-[140px]">
            <Container>
                <Reveal>
                    <SectionHeader
                        number="제1조"
                        eyebrow="Scope of Services"
                        serif
                        title="ONE CONTRACT, ALL MARKETING."
                        lead="세부 업무가 궁금하시다면 여기를 보십시오. 아래 전부가 한 계약의 범위이고, 하나의 책임자가 하나의 예산으로 운영합니다."
                    />
                </Reveal>
            </Container>

            <div ref={stageRef} className="mt-stage mt-stage-track lg:h-[185svh]">
                <div className="mt-stage-pin">
                    <Container className="pt-12 lg:pt-0">
                        <div>
                            {CONTRACT_SCOPE.map((annex, i) => {
                                const a = 0.05 + i * 0.14;
                                return (
                                    <div
                                        key={annex.no}
                                        className="mt-annex relative grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-10 gap-y-3 py-6 lg:py-5"
                                        style={{ ["--a" as string]: a }}
                                    >
                                        <span
                                            className="mt-annex-rule absolute top-0 left-0 right-0 h-px"
                                            style={{ background: "var(--mt-line-strong)" }}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                                {annex.no}
                                            </p>
                                            <Link href={path(annex.href)} className="group mt-2 inline-flex items-center gap-1.5">
                                                <span
                                                    className="mt-en text-[13px] font-medium"
                                                    style={{ color: "var(--mt-ink)", letterSpacing: "0.1em" }}
                                                >
                                                    <span className="mt-underline">{annex.en}</span>
                                                </span>
                                                <span
                                                    aria-hidden
                                                    className="text-[12px] transition-transform duration-200 group-hover:translate-x-1"
                                                    style={{ color: "var(--mt-gray)" }}
                                                >
                                                    →
                                                </span>
                                            </Link>
                                        </div>

                                        <ul className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13.5px] leading-relaxed">
                                            {annex.items.map((it, j) => (
                                                <li
                                                    key={it.label}
                                                    className="mt-aitem flex items-center"
                                                    style={{
                                                        color: "var(--mt-charcoal)",
                                                        ["--ai" as string]: a + 0.035 + j * 0.011,
                                                    }}
                                                >
                                                    {j > 0 && (
                                                        <span aria-hidden className="mx-2" style={{ color: "var(--mt-line-strong)" }}>
                                                            ·
                                                        </span>
                                                    )}
                                                    <span>{it.label}</span>
                                                    {it.badge && <Badge>{it.badge}</Badge>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                            <div style={{ borderTop: "1px solid var(--mt-line)" }} />

                            <p
                                className="mt-pi mt-6 text-[12.5px]"
                                style={{ color: "var(--mt-gray-light)", ["--a" as string]: 0.88, ["--o0" as string]: 0.4 }}
                            >
                                배지가 붙은 항목은 확정 서비스가 아니라 조건이 갖춰지는 시점에 편입되는
                                항목입니다. 하는 것과 하겠다는 것을 구분해 적습니다.
                            </p>

                            {/* 모든 별지가 완성된 뒤 활성화되는 CTA — 클릭은 항상 가능 */}
                            <div
                                className="mt-pi mt-6"
                                style={{ ["--a" as string]: 0.92, ["--o0" as string]: 0.35, ["--dy" as string]: "6px" }}
                            >
                                <Link
                                    href={path("/lawfirm-marketing")}
                                    className="mt-plink group inline-flex items-center gap-2 text-[15px] font-medium"
                                    style={{ color: "var(--mt-ink)" }}
                                >
                                    <span className="relative">
                                        한 계약에서 실제로 하는 일 보기
                                        <span className="mt-plink-bar" style={{ ["--a" as string]: 0.95 }} aria-hidden />
                                    </span>
                                    <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
                                        →
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </Container>
                </div>
            </div>
        </section>
    );
}
