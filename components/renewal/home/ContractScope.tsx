import Link from "next/link";
import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { CONTRACT_SCOPE, path } from "@/data/renewal/site";

// 제2조 — 계약 범위 (The Contract 개편, ChannelGrid 대체).
//
// 카드 그리드가 아니라 계약 별지처럼 품목을 전부 나열한다.
// 확정 품목과 조건부 품목(badge)을 구분해 적는 것 자체가 신뢰 장치다(§42).
// 각 별지는 해당 서비스 상세로 들어간다 — ChannelGrid 가 갖던 내부링크 축 유지.

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
    return (
        <Section id="scope">
            <Container>
                <SectionHeader
                    number="제2조"
                    eyebrow="Scope of Services"
                    serif
                    title="하나의 계약으로 운영되는 마케팅."
                    lead="채널을 여섯 개로 나눠 팔지 않습니다. 아래 전부가 한 계약의 범위이고, 하나의 책임자가 하나의 예산으로 운영합니다."
                />

                <div className="mt-14 md:mt-20" style={{ borderTop: "1px solid var(--mt-line-strong)" }}>
                    {CONTRACT_SCOPE.map((annex, i) => (
                        <Reveal key={annex.no} index={i % 2}>
                            <div
                                className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-10 gap-y-3 py-7 md:py-8"
                                style={{ borderBottom: "1px solid var(--mt-line)" }}
                            >
                                <div>
                                    <p className="mt-en mt-num text-[10px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                        {annex.no}
                                    </p>
                                    <Link
                                        href={path(annex.href)}
                                        className="group mt-2 inline-flex items-center gap-1.5"
                                    >
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
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <p className="mt-8 text-[12.5px]" style={{ color: "var(--mt-gray-light)" }}>
                        배지가 붙은 항목은 확정 서비스가 아니라 조건이 갖춰지는 시점에 편입되는
                        항목입니다. 하는 것과 하겠다는 것을 구분해 적습니다.
                    </p>
                </Reveal>
            </Container>
        </Section>
    );
}
