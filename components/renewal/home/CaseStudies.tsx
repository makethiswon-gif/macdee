import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { path } from "@/data/renewal/site";
import type { CaseStudy } from "@/data/renewal/cases";

// SECTION 07 — Case Study.
// 로고 나열이 아니라 BEFORE → STRATEGY → RESULT 구조로 보여준다.
//
// 데이터가 없으면 섹션 자체가 사라진다. 빈 자리를 지어낸 숫자로 채우지 않는다(§42).
// isSample이 하나라도 있으면 화면에 경고 배너가 강제로 뜬다 — 실수로 배포되어도
// 방문자가 샘플임을 즉시 알 수 있다.

export default function CaseStudies({ cases }: { cases: CaseStudy[] }) {
    if (!cases.length) return null;

    const hasSample = cases.some((c) => c.isSample);

    return (
        <Section>
            <Container>
                <SectionHeader
                    number="06"
                    eyebrow="Case Studies"
                    title="무엇을 바꿨고, 무엇이 달라졌는지."
                    lead="로고를 모아두는 대신 구조를 공개합니다. 어떤 상태였고, 무엇을 했고, 어떤 지표가 움직였는지."
                />

                {hasSample && (
                    <div
                        className="mt-10 px-5 py-4 text-[13px] leading-relaxed"
                        style={{
                            border: "1px solid #C08A2E",
                            background: "rgba(192,138,46,0.07)",
                            color: "#8A6320",
                        }}
                        role="note"
                    >
                        <strong className="font-semibold">샘플 — 실제 데이터가 아닙니다.</strong> 레이아웃
                        확인용으로만 표시되며, 성과 수치는 측정된 값이 확인된 사례부터 순차적으로 등록합니다.
                    </div>
                )}

                <div className="mt-14 md:mt-20 flex flex-col">
                    {cases.map((c, i) => (
                        <Reveal key={c.id} index={i}>
                            <article
                                className="py-12 md:py-16"
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                            >
                                <div className="flex items-baseline gap-4 mb-10">
                                    <span
                                        className="mt-en mt-label mt-num"
                                        style={{ color: "var(--mt-accent)" }}
                                    >
                                        {c.label}
                                    </span>
                                    <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                                    <h3 className="text-[17px] font-semibold">{c.field}</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
                                    <div>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            Before
                                        </p>
                                        <ul className="flex flex-col gap-2.5">
                                            {c.before.map((b) => (
                                                <li key={b} className="mt-body text-[13.5px]">
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            Strategy
                                        </p>
                                        <ul className="flex flex-col gap-2.5">
                                            {c.strategy.map((s) => (
                                                <li key={s} className="mt-body text-[13.5px]">
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            Result
                                        </p>
                                        <ul className="flex flex-col gap-3">
                                            {c.result.map((r) => (
                                                <li
                                                    key={r.metric}
                                                    className="flex items-baseline justify-between gap-4"
                                                >
                                                    <span className="mt-body text-[13.5px]">{r.metric}</span>
                                                    <span
                                                        className="mt-num text-[14px] font-medium"
                                                        style={{ color: "var(--mt-ink)" }}
                                                    >
                                                        {r.change}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                </div>

                <Reveal index={1}>
                    <div className="mt-12">
                        <ArrowLink href={path("/work")}>전체 사례 보기</ArrowLink>
                    </div>
                </Reveal>
            </Container>
        </Section>
    );
}
