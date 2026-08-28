"use client";

import Link from "next/link";
import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import ScrollHint from "../ScrollHint";
import { useScrollProgress } from "../useScrollProgress";
import { SERVICES, path } from "@/data/renewal/site";

// 서비스 범위 — 01~06.
//
// 한글 업무명이 주 제목, 영어는 작은 보조 레이블. 스크롤 진행에 따라
// 여섯 줄이 차례로 펼쳐진다(기존 unfold 모션 유지): 번호 → 상단 선 →
// 품목 순차 → 조건부 배지. 전부 --p 의 순수 함수 — 역스크롤 역재생.
// 모바일은 품목이 길어지지 않도록 세부 업무를 접어둔다(<details>).
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
                        title={
                            <>
                                광고부터 상담 분석까지,
                                <br />
                                필요한 일은 이 안에 다 있습니다.
                            </>
                        }
                        lead="채널별 업체에 업무를 나누는 방식이 아닙니다. 로펌의 목표와 예산에 맞춰 필요한 영역을 한 팀이 함께 운영합니다."
                    />
                </Reveal>
            </Container>

            <div ref={stageRef} className="mt-stage mt-stage-track lg:h-[185svh]">
                <div className="mt-stage-pin">
                    <Container className="pt-12 lg:pt-0">
                        <div className="mb-6 hidden lg:block">
                            <ScrollHint>아래로 스크롤하면, 여섯 영역이 차례로 펼쳐집니다</ScrollHint>
                        </div>
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
                                        <div>
                                            <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                                {svc.no}
                                            </p>
                                            <Link href={path(svc.href)} className="group mt-2 inline-flex items-baseline gap-2.5">
                                                <span className="text-[16px] font-semibold" style={{ color: "var(--mt-ink)" }}>
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

                                        {/* 데스크톱 — 품목 순차 등장 */}
                                        <ul className="hidden md:flex flex-wrap items-center gap-x-2 gap-y-2 text-[13.5px] leading-relaxed">
                                            {svc.items.map((it, j) => (
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

                                        {/* 모바일 — 세부 업무는 접어서 목록이 길어지지 않게 */}
                                        <details className="md:hidden mt-svc-details">
                                            <summary
                                                className="text-[12.5px] font-medium cursor-pointer select-none"
                                                style={{ color: "var(--mt-gray)" }}
                                            >
                                                세부 업무 {svc.items.length}개 보기
                                            </summary>
                                            <div className="mt-3">
                                                <ItemList items={svc.items} />
                                            </div>
                                        </details>
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

                            {/* 변호사 광고의 특수성 — 일반 대행사와 갈라지는 지점 */}
                            <p
                                className="mt-pi mt-3 text-[13px] font-medium"
                                style={{ color: "var(--mt-ink)", ["--a" as string]: 0.9, ["--o0" as string]: 0.4 }}
                            >
                                위 모든 광고와 콘텐츠는 변호사법과 대한변호사협회 광고 규정 안에서
                                집행합니다. 법률 표현 검수는 법학 전공자가 합니다.
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
                                        실제로 하는 일 자세히 보기
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
