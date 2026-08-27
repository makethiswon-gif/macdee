import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { LEAD_TO_CASE, path } from "@/data/renewal/site";

// 차별화 섹션 — 광고에서 수임까지의 연결.
//
// Data & Conversion 을 여섯 번째 서비스 카드로 두지 않는 이유가 여기 있다.
// 이건 나머지 네 영역이 잘 돌아가는지 판단하게 해주는 기반이라,
// 카드 하나로 늘어놓으면 "옵션 중 하나"로 읽힌다.

export default function LeadToCase() {
    const { en, title, lead, chain, points, href } = LEAD_TO_CASE;

    return (
        <Section dark>
            <Container>
                <SectionHeader number="03" eyebrow={en} title={title} lead={lead} />

                {/* 채널 → 수임 사슬 */}
                <Reveal>
                    <ol className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-px" style={{ background: "var(--mt-line)" }}>
                        {chain.map((c, i) => (
                            <li
                                key={c.en}
                                className="relative px-6 py-8"
                                style={{ background: "var(--mt-dark-bg)" }}
                            >
                                <span
                                    className="mt-en mt-num text-[10px] font-medium"
                                    style={{ color: "var(--mt-accent)" }}
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <p
                                    className="mt-en mt-label mt-4"
                                    style={{ color: "var(--mt-bg)" }}
                                >
                                    {c.en}
                                </p>
                                <p className="mt-body mt-3 text-[12.5px] leading-[1.6]">{c.ko}</p>
                            </li>
                        ))}
                    </ol>
                </Reveal>

                <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-20 lg:items-end">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        {points.map((p, i) => (
                            <Reveal key={p} as="li" index={i % 2}>
                                <div className="py-5" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                    <p className="text-[14.5px] leading-[1.7]" style={{ color: "var(--mt-bg)" }}>
                                        {p}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </ul>

                    <Reveal>
                        <div className="shrink-0">
                            <ArrowLink href={path(href)}>
                                <span style={{ color: "var(--mt-bg)" }}>데이터 운영 방식 보기</span>
                            </ArrowLink>
                        </div>
                    </Reveal>
                </div>
            </Container>
        </Section>
    );
}
