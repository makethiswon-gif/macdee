import Link from "next/link";
import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { CHANNELS, path } from "@/data/renewal/site";

// SECTION 04 — 하나의 전략, 모든 채널.
// 6개 영역이 각각 서비스 상세 페이지로 들어가는 입구다. 내부링크 구조의 축.

export default function ChannelGrid() {
    return (
        <Section id="what-we-do">
            <Container>
                <SectionHeader
                    number="05"
                    eyebrow="One Team, Every Channel"
                    title={
                        <>
                            하나의 전략.
                            <br />
                            모든 채널.
                        </>
                    }
                />

                <div
                    className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px"
                    style={{ background: "var(--mt-line)" }}
                >
                    {CHANNELS.map((c, i) => (
                        <Reveal key={c.key} index={i % 3}>
                            <Link
                                href={path(c.href)}
                                className="group flex flex-col h-full px-7 py-10 md:px-9 md:py-12 transition-colors"
                                style={{ background: "var(--mt-bg)" }}
                            >
                                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    {c.en}
                                </p>

                                <h3 className="mt-h3 mt-5">{c.title}</h3>

                                <p className="mt-body mt-4 text-[14px]">{c.desc}</p>

                                <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-1.5">
                                    {c.items.map((it) => (
                                        <li
                                            key={it}
                                            className="text-[12px]"
                                            style={{ color: "var(--mt-gray-light)" }}
                                        >
                                            {it}
                                        </li>
                                    ))}
                                </ul>

                                <span
                                    className="mt-auto pt-10 inline-flex items-center gap-1.5 text-[13px] font-medium"
                                    style={{ color: "var(--mt-ink)" }}
                                >
                                    자세히 보기
                                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                                        →
                                    </span>
                                </span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </Container>
        </Section>
    );
}
