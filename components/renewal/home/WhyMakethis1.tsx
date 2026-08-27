import Image from "next/image";
import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import Founder from "../Founder";
import { TEAM, DISCIPLINES, path } from "@/data/renewal/site";

// SECTION 06 — 왜 MAKETHIS1인가.
// 이 섹션만은 주장이 아니라 이력으로 증명한다. 전부 실재하는 사람이고 사진도 있다.

export default function WhyMakethis1() {
    return (
        <Section>
            <Container>
                <SectionHeader
                    number="06"
                    eyebrow="Why MAKETHIS1"
                    title={
                        <>
                            법률·콘텐츠·광고·검색을 아는 사람들이
                            <br />
                            하나의 팀으로 움직입니다.
                        </>
                    }
                    lead="기자와 방송작가가 글을 쓰고, 법학 전공자가 검수하고, 퍼포먼스 담당이 예산을 조정합니다. 한 사람이 다 하지 않습니다."
                />

                {/* 5개 직능 */}
                <div
                    className="mt-14 md:mt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px"
                    style={{ background: "var(--mt-line)" }}
                >
                    {DISCIPLINES.map((d, i) => (
                        <Reveal key={d.en} index={i}>
                            <div className="px-6 py-8 h-full" style={{ background: "var(--mt-bg)" }}>
                                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                    {d.en}
                                </p>
                                <p className="mt-body mt-3 text-[13px]">{d.ko}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* 대표 — 팀 그리드에 섞지 않는다 */}
                <div className="mt-16 md:mt-24">
                    <Founder />
                </div>

                {/* 팀 */}
                <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-12">
                    {TEAM.map((m, i) => (
                        <Reveal key={m.name} index={i % 3}>
                            <figure>
                                <div
                                    className="relative w-full aspect-[3/4] overflow-hidden"
                                    style={{ background: "var(--mt-line)" }}
                                >
                                    <Image
                                        src={m.photo}
                                        alt={`${m.name} 프로필`}
                                        fill
                                        sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 16vw"
                                        className="object-cover"
                                        style={{ filter: "grayscale(100%)" }}
                                    />
                                </div>
                                <figcaption className="mt-4">
                                    <p
                                        className="mt-en text-[9.5px] font-medium"
                                        style={{ color: "var(--mt-gray-light)" }}
                                    >
                                        {m.role}
                                    </p>
                                    <p
                                        className="mt-2 text-[15px] font-semibold"
                                        style={{ color: "var(--mt-ink)" }}
                                    >
                                        {m.name}
                                    </p>
                                    <p className="mt-body mt-2 text-[12px] leading-[1.65]">{m.background}</p>
                                </figcaption>
                            </figure>
                        </Reveal>
                    ))}
                </div>

                <Reveal index={1}>
                    <div className="mt-14">
                        <ArrowLink href={path("/about")}>팀과 회사 소개 보기</ArrowLink>
                    </div>
                </Reveal>
            </Container>
        </Section>
    );
}
