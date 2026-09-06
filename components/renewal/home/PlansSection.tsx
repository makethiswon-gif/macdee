import Link from "next/link";
import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { PLANS, PLANS_FOOTNOTE, PLANS_FAQ, path } from "@/data/renewal/site";

// #plans — 세 가지 운영안과 예상 비용.
//
// SaaS 가격표가 아니라 미니 견적서다: 종이 카드, 얇은 괘선, 고정폭 숫자.
// GROWTH(주력 운영안)만 파란 상단 선과 작은 배지로 강조한다.
// 금액은 대표 지정 공개 기준가(2026-08-29) — 임의 수정 금지.
// CTA 는 진단 폼으로 가며 ?plan= 쿼리로 선택한 운영안이 폼에 반영된다.

export default function PlansSection() {
    return (
        <section id="plans" data-clause="PLANS" className="py-[88px] md:py-[140px]">
            <Container>
                <Reveal>
                    <SectionHeader
                        eyebrow="Sample Estimate"
                        serif
                        title="세 가지 운영안과 예상 비용"
                        lead="현재 상태와 목표에 따라 달라지지만, 상담 전에 판단할 수 있도록 기본 운영 범위를 공개합니다."
                    />
                </Reveal>

                <div className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
                    {PLANS.map((plan, i) => (
                        <Reveal key={plan.key} index={i} className="h-full">
                            <article
                                className="mt-plan h-full flex flex-col px-7 py-8 md:px-8 md:py-9"
                                data-featured={plan.featured ? "" : undefined}
                            >
                                {/* 헤더 — 견적서 표제 */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p
                                            className="mt-en text-[11px] font-semibold"
                                            style={{ color: "var(--mt-ink)", letterSpacing: "0.14em" }}
                                        >
                                            {plan.en}
                                        </p>
                                        <p className="mt-1.5 text-[13px] font-medium" style={{ color: "var(--mt-gray)" }}>
                                            {plan.ko}
                                        </p>
                                    </div>
                                    {plan.badge && (
                                        <span
                                            className="mt-en shrink-0 px-2 pt-[4px] pb-[3px] text-[9.5px] font-medium rounded-[2px]"
                                            style={{ border: "1px solid var(--mt-accent)", color: "var(--mt-accent)" }}
                                        >
                                            {plan.badge}
                                        </span>
                                    )}
                                </div>

                                {/* 금액 — 고정폭 숫자, 견적서 톤 */}
                                <div className="mt-6 pb-6" style={{ borderBottom: "1px solid var(--mt-line)" }}>
                                    <p
                                        className="mt-plan-price mt-num text-[clamp(1.35rem,1.8vw,1.6rem)] font-semibold leading-none"
                                        style={{ color: "var(--mt-ink)" }}
                                    >
                                        {plan.price}
                                    </p>
                                    <p className="mt-2 text-[11.5px]" style={{ color: "var(--mt-gray-light)" }}>
                                        {plan.priceNote}
                                    </p>
                                </div>

                                <p className="mt-5 text-[13.5px] leading-[1.7]" style={{ color: "var(--mt-charcoal)" }}>
                                    {plan.desc}
                                </p>

                                {/* 포함 내역 */}
                                <div className="mt-6 flex-1">
                                    <p className="mt-en mt-label text-[9px]" style={{ color: "var(--mt-gray)" }}>
                                        {plan.includesLabel}
                                    </p>
                                    <ul className="mt-3">
                                        {plan.includes.map((it) => (
                                            <li
                                                key={it}
                                                className="flex gap-2.5 py-[7px] text-[13px] leading-[1.55]"
                                                style={{ borderTop: "1px solid var(--mt-line)", color: "var(--mt-charcoal)" }}
                                            >
                                                <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                                    ―
                                                </span>
                                                {it}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CTA — 선택한 운영안이 진단 폼에 반영된다 */}
                                <div className="mt-7">
                                    <Link
                                        href={path(`/diagnose?plan=${plan.key}#form`)}
                                        className="mt-plan-cta inline-flex w-full items-center justify-center gap-2 h-[48px] text-[13.5px] font-medium rounded-[2px] transition-colors"
                                    >
                                        {plan.en}로 상담하기 <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>

                <Reveal index={1}>
                    <p className="mt-8 text-[12px] leading-relaxed max-w-[720px]" style={{ color: "var(--mt-gray-light)" }}>
                        {PLANS_FOOTNOTE}
                    </p>
                </Reveal>

                {/* 미니 FAQ — 상담 전에 걸리는 질문을 미리 치운다 */}
                <Reveal index={2}>
                    <div className="mt-14 md:mt-16 max-w-[760px]">
                        <p className="mt-en mt-label mb-2" style={{ color: "var(--mt-gray)" }}>
                            FAQ
                        </p>
                        {PLANS_FAQ.map((f) => (
                            <details key={f.q} className="mt-svc-details" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                <summary
                                    className="py-4 text-[14px] font-medium cursor-pointer select-none"
                                    style={{ color: "var(--mt-ink)" }}
                                >
                                    {f.q}
                                </summary>
                                <p className="mt-body pb-5 text-[13.5px] max-w-[64ch]">{f.a}</p>
                            </details>
                        ))}
                        <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
