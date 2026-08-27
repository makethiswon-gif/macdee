import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeader, Eyebrow, Button } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import { TEAM, DISCIPLINES, COMPANY, PROOF_STATS, PRIMARY_CTA, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

// 회사 · 팀.
//
// ⚠️ 여기 쓰인 이력은 전부 기존 /makethisone 에 이미 공개돼 있던 것이다.
// 없는 경력·수상·자격을 만들지 않는다(§42).
//
// 운영 정책(온보딩 기간, 회의 주기, 검수 절차, 이해상충 정책 등)은
// 아직 확정되지 않았으므로 이 페이지에 쓰지 않는다. 확정 후 추가한다.

const URL = "https://www.makethis1.com/renewal/about";
const TITLE = "회사 소개 · 팀 | MAKETHIS1";
const DESC =
    "법률·콘텐츠·광고·검색을 아는 사람들이 하나의 팀으로 움직입니다. 기자와 방송작가가 쓰고, 법학 전공자가 검수합니다.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR" },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function Page() {
    return (
        <>
            <section className="pt-[120px] md:pt-[168px] pb-14 md:pb-20">
                <Container>
                    <Reveal>
                        <Eyebrow>About</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[20ch]">
                            법률·콘텐츠·광고·검색을 아는 사람들이
                            <br />
                            하나의 팀으로 움직입니다.
                        </h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[620px]">
                            {COMPANY.legalName}은 변호사와 법무법인만 상대하는 마케팅 회사입니다.
                            업종을 넓히지 않았기 때문에 법률 분야에서만 쌓인 판단이 있습니다.
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* 공표 수치 */}
            <Section tight>
                <Container>
                    <Reveal>
                        <div
                            className="pt-12 flex flex-wrap gap-x-16 gap-y-10"
                            style={{ borderTop: "1px solid var(--mt-line)" }}
                        >
                            {PROOF_STATS.map((s) => (
                                <div key={s.label}>
                                    <div className="flex items-baseline gap-0.5">
                                        <span
                                            className="mt-num text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-tight"
                                            style={{ color: "var(--mt-ink)" }}
                                        >
                                            {s.value}
                                        </span>
                                        <span
                                            className="text-[1.125rem] font-medium"
                                            style={{ color: "var(--mt-accent)" }}
                                        >
                                            {s.suffix}
                                        </span>
                                    </div>
                                    <p className="mt-body mt-3 text-[13px]">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </Container>
            </Section>

            {/* 다섯 개 직능 */}
            <Section dark tight>
                <Container>
                    <SectionHeader
                        eyebrow="How we operate"
                        title="한 사람이 다 하지 않습니다."
                        lead="기자와 방송작가가 글을 쓰고, 법학 전공자가 검수하고, 마케팅 담당이 예산을 조정합니다. 대행사 한 곳에 맡겼을 때 흔히 벌어지는 '한 명이 전부 하는' 구조를 피하기 위한 것입니다."
                    />
                    <div
                        className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px"
                        style={{ background: "var(--mt-line)" }}
                    >
                        {DISCIPLINES.map((d, i) => (
                            <Reveal key={d.en} index={i}>
                                <div className="px-6 py-8 h-full" style={{ background: "var(--mt-dark-bg)" }}>
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                        {d.en}
                                    </p>
                                    <p className="mt-body mt-3 text-[13px]">{d.ko}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </Section>

            {/* 팀 */}
            <Section>
                <Container>
                    <SectionHeader eyebrow="Team" title="누가 쓰고 누가 검수하는지 밝힙니다." />

                    <div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-12">
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
                                        <p className="mt-2 text-[15px] font-semibold">{m.name}</p>
                                        <p className="mt-body mt-2 text-[12px] leading-[1.65]">{m.background}</p>
                                    </figcaption>
                                </figure>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </Section>

            {/* 회사 정보 */}
            <Section tight>
                <Container>
                    <div
                        className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-10"
                        style={{ borderTop: "1px solid var(--mt-line)" }}
                    >
                        <div>
                            <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                                Company
                            </p>
                            <p className="text-[15px] font-medium">{COMPANY.legalName}</p>
                            <p className="mt-body mt-2 text-[13px]">{COMPANY.brand}</p>
                        </div>
                        <div>
                            <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                                Contact
                            </p>
                            <a
                                href={`tel:${COMPANY.phone.replace(/-/g, "")}`}
                                className="mt-num text-[15px] font-medium hover:opacity-60"
                            >
                                {COMPANY.phone}
                            </a>
                        </div>
                        <div>
                            <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                                Address
                            </p>
                            <p className="mt-body text-[13px]">{COMPANY.address}</p>
                        </div>
                    </div>

                    <Reveal>
                        <div className="mt-14">
                            <Button href={path(PRIMARY_CTA.href)} variant="primary">
                                {PRIMARY_CTA.label} <span aria-hidden>→</span>
                            </Button>
                        </div>
                    </Reveal>
                </Container>
            </Section>
        </>
    );
}
