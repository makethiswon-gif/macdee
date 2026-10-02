import Image from "next/image";
import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Founder from "../Founder";
import TeamProductionScene from "./TeamProductionScene";
import { TEAM, path } from "@/data/renewal/site";

export default function WhyMakethis1() {
    return (
        <Section data-clause="TEAM">
            <Container>
                <SectionHeader
                    eyebrow="Why MAKETHIS1"
                    serif
                    title="로펌 마케팅을 맡는 사람들."
                    lead="기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다."
                />

                <TeamProductionScene />

                {/* 대표 — 팀 그리드에 섞지 않는다 */}
                <div className="mt-16 md:mt-24">
                    <Founder />
                </div>

                {/* 실제 팀 소개는 장면 진행률과 관계없이 읽을 수 있다. */}
                <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-12">
                    {TEAM.map((m) => (
                        <figure key={m.name}>
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
                                />
                            </div>
                            <figcaption className="mt-4">
                                <p className="mt-en text-[10.5px] font-medium" style={{ color: "var(--mt-gray-light)" }}>
                                    {m.role}
                                </p>
                                <p className="mt-2 text-[15px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                    {m.name}
                                </p>
                                <p className="mt-body mt-2 text-[12px] leading-[1.65]">{m.background.split(" · ")[0]}</p>
                            </figcaption>
                        </figure>
                    ))}
                </div>

                <div className="mt-14">
                    <ArrowLink href={path("/about")}>팀과 회사 소개 보기</ArrowLink>
                </div>
            </Container>
        </Section>
    );
}
