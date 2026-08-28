import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { JOURNEY, JOURNEY_CHAIN, JOURNEY_NOTE, path } from "@/data/renewal/site";

// 제1조 — 의뢰인 여정 (정보 구조 재설계).
//
// 기존 MarketingSystem(6단계 영어 스크롤 내러티브, ~508svh)과
// LeadToCase(대형 데이터 흐름도)를 이 한 섹션으로 통합했다.
// "많은 업무"가 아니라 "한 의뢰인이 로펌을 발견하고 사건을 맡기기까지"를
// 세 단계로 말한다. 효과 없이 읽어도 구조가 그대로 이해된다 —
// 모션은 작은 reveal 뿐이고 스크롤을 강제하지 않는다.
//
// 세부 업무는 라벨로만. 전체 품목은 별지(제4조 ContractScope)가 담당한다.

export default function ClientJourney() {
    return (
        <Section id="system">
            <Container>
                <SectionHeader
                    number="제1조"
                    eyebrow="Client Journey"
                    serif
                    title={
                        <>
                            한 의뢰인이 로펌을 발견하고
                            <br />
                            사건을 맡기기까지.
                        </>
                    }
                    lead="우리가 관리하는 것은 광고가 아니라 이 여정 전체입니다. 단계마다 다른 업체가 맡으면 사이가 비고, 그 사이에서 의뢰인이 사라집니다."
                />

                <ol className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-12">
                    {JOURNEY.map((step, i) => (
                        <Reveal key={step.no} as="li" index={i}>
                            <div
                                className="h-full pt-7"
                                style={{ borderTop: "2px solid var(--mt-ink)" }}
                            >
                                <p className="mt-en mt-num text-[11px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                    {step.no}
                                </p>
                                <h3 className="mt-serif mt-5 text-[clamp(1.3rem,2vw,1.6rem)] font-semibold leading-[1.4]" style={{ color: "var(--mt-ink)" }}>
                                    {step.title}
                                </h3>
                                <p className="mt-body mt-4 max-w-[40ch]">{step.desc}</p>
                                <ul className="mt-6 flex flex-wrap gap-2">
                                    {step.labels.map((l) => (
                                        <li
                                            key={l}
                                            className="text-[11.5px] px-2.5 pt-[5px] pb-[4px] rounded-[2px]"
                                            style={{ border: "1px solid var(--mt-line-strong)", color: "var(--mt-gray)" }}
                                        >
                                            {l}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    ))}
                </ol>

                {/* 3단계의 실체 — 압축 데이터 흐름 (기존 LeadToCase 의 핵심만) */}
                <Reveal>
                    <div
                        className="mt-14 md:mt-16 px-7 py-8 md:px-9 rounded-[2px]"
                        style={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)" }}
                    >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                Lead to Case
                            </span>
                            <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                            {JOURNEY_CHAIN.map((c, i) => (
                                <span key={c} className="flex items-center gap-3 text-[14px] font-medium" style={{ color: "var(--mt-ink)" }}>
                                    {c}
                                    {i < JOURNEY_CHAIN.length - 1 && (
                                        <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                            →
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                        <p className="mt-body mt-4 text-[13.5px] max-w-[70ch]">
                            유입이 어느 채널에서 왔는지 구분하고, 채널별 비용과 상담 기여를 같은 표에서
                            봅니다. 그 표를 근거로 다음 달 예산을 옮깁니다. {JOURNEY_NOTE}
                        </p>
                        <div className="mt-5">
                            <ArrowLink href={path("/conversion")}>데이터 운영 방식 보기</ArrowLink>
                        </div>
                    </div>
                </Reveal>
            </Container>
        </Section>
    );
}
