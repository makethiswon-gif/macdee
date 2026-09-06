"use client";

import Link from "next/link";
import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { SERVICES, path } from "@/data/renewal/site";

// 서비스 범위 — 01~06.
//
// 한글 업무명이 주 제목, 영어는 작은 보조 레이블. 스크롤 진행에 따라
// 여섯 줄이 차례로 펼쳐진다(기존 unfold 모션 유지): 번호 → 상단 선 →
// 품목 순차 → 조건부 배지. 전부 --p 의 순수 함수 — 역스크롤 역재생.
// 모든 화면에서 한 줄 설명을 먼저 보여주고 세부 업무는 <details>로 제공한다.
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

function ItemList({ items }: { items: (typeof SERVICES)[number]["items"] }) {
    return (
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13.5px] leading-relaxed">
            {items.map((it, j) => (
                <li key={it.label} className="flex items-center" style={{ color: "var(--mt-charcoal)" }}>
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
    );
}

export default function ServicesSection() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section id="scope" data-clause="SERVICES" className="pt-[88px] md:pt-[140px] pb-[88px] md:pb-[140px]">
            <Container>
                <Reveal>
                    <SectionHeader
                        eyebrow="Services"
                        serif
                        title="우리가 맡는 일."
                    />
                </Reveal>
            </Container>

            {/* 185→150svh — 홈 길이 다이어트(2026-08-29). 스크럽이 조금 빨라질 뿐 서사는 동일 */}
            <div ref={stageRef} className="mt-stage mt-stage-track lg:h-[150svh]">
                {/* 기본 pin 은 세로 중앙 정렬이라 목록이 접힌 초반에 위쪽이 통째로
                    빈다 — 이 섹션은 상단 정렬로 붙여 헤더와의 간격을 없앤다 */}
                <div className="mt-stage-pin" style={{ justifyContent: "flex-start" }}>
                    <Container className="pt-12 lg:pt-24">
                        <div>
                            {SERVICES.map((svc, i) => {
                                const a = 0.05 + i * 0.14;
                                return (
                                    <div
                                        key={svc.no}
                                        className="mt-annex relative grid grid-cols-1 md:grid-cols-[240px_1fr] gap-x-10 gap-y-3 py-6 lg:py-5"
                                        style={{ ["--a" as string]: a }}
                                    >
                                        <span
                                            className="mt-annex-rule absolute top-0 left-0 right-0 h-px"
                                            style={{ background: "var(--mt-line-strong)" }}
                                            aria-hidden="true"
                                        />
                                        <div className="mt-annex-heading">
                                            <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                                {svc.no}
                                            </p>
                                            <Link href={path(svc.href)} className="group mt-2 inline-flex items-baseline gap-2.5">
                                                <span className="mt-annex-title text-[16px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                                    <span className="mt-underline">{svc.ko}</span>
                                                </span>
                                                <span
                                                    className="mt-en text-[9px] font-medium"
                                                    style={{ color: "var(--mt-gray-light)", letterSpacing: "0.12em" }}
                                                >
                                                    {svc.en}
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

                                        <div>
                                            <p className="mt-body mt-service-summary">{svc.summary}</p>
                                        <details className="mt-svc-details mt-3">
                                            <summary
                                                className="text-[12.5px] font-medium cursor-pointer select-none"
                                                style={{ color: "var(--mt-gray)" }}
                                            >
                                                세부 업무 보기
                                            </summary>
                                            <div className="mt-3">
                                                <ItemList items={svc.items} />
                                            </div>
                                        </details>
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{ borderTop: "1px solid var(--mt-line)" }} />

                            <p
                                className="mt-pi mt-6 text-[12.5px]"
                                style={{ color: "var(--mt-gray-light)", ["--a" as string]: 0.88, ["--o0" as string]: 0.4 }}
                            >
                                운영 범위는 상품에 따라 다릅니다. 조건부 항목은 확정 서비스가 아니며, 필요성·광고 허용 여부에 따라 검토합니다.
                            </p>

                            {/* 변호사 광고의 특수성 — 일반 대행사와 갈라지는 지점 */}
                            <p
                                className="mt-pi mt-3 text-[13px] font-medium"
                                style={{ color: "var(--mt-ink)", ["--a" as string]: 0.9, ["--o0" as string]: 0.4 }}
                            >
                                변호사법·대한변협 광고 규정을 준수하며, 법률 표현은 법학 전공자가 검수합니다.
                            </p>

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
                                        전체 업무 보기
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
