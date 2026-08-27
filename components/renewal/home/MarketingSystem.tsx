import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { SYSTEM_STEPS } from "@/data/renewal/site";

// SECTION 03 — 발견부터 수임까지 6단계.
// 카드가 아니라 목록이다. 카드 남발은 SaaS 신호(§13).

export default function MarketingSystem() {
    return (
        <Section id="system">
            <Container>
                <SectionHeader
                    number="02"
                    eyebrow="Marketing System"
                    title={
                        <>
                            고객이 로펌을 발견하는 순간부터
                            <br />
                            사건을 맡기는 순간까지.
                        </>
                    }
                    lead="각 단계를 다른 회사가 맡으면 사이가 비고, 그 사이에서 고객이 사라집니다. 여섯 단계를 한 팀이 이어서 운영합니다."
                />

                <ol className="mt-16 md:mt-24">
                    {SYSTEM_STEPS.map((s, i) => (
                        <Reveal key={s.no} as="li" index={i % 3}>
                            <div
                                className="grid grid-cols-1 md:grid-cols-[80px_1fr] lg:grid-cols-[80px_320px_1fr] gap-x-8 gap-y-4 py-10 md:py-12"
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                            >
                                <span
                                    className="mt-en mt-num text-[13px] font-medium pt-1"
                                    style={{ color: "var(--mt-accent)" }}
                                >
                                    {s.no}
                                </span>

                                <div>
                                    <p className="mt-en mt-label mb-3" style={{ color: "var(--mt-gray)" }}>
                                        {s.en}
                                    </p>
                                    <h3 className="mt-h3">{s.title}</h3>
                                </div>

                                <div>
                                    <p className="mt-body max-w-[520px]">{s.desc}</p>
                                    <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                                        {s.tags.map((t) => (
                                            <li
                                                key={t}
                                                className="mt-en text-[10.5px] font-medium"
                                                style={{ color: "var(--mt-gray-light)" }}
                                            >
                                                {t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </ol>

                <div style={{ borderTop: "1px solid var(--mt-line)" }} />
            </Container>
        </Section>
    );
}
