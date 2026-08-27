import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeader, Eyebrow, Button } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import { CHANNELS, SYSTEM_STEPS, PRIMARY_CTA, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

// WHAT WE DO 허브. 6개 영역으로 들어가는 입구이자, 홈의 #system 을 대신 받는 곳.

const URL = "https://www.makethis1.com/renewal/lawfirm-marketing";
const TITLE = "로펌 통합 마케팅 | MAKETHIS1";
const DESC =
    "광고·검색·콘텐츠·홈페이지를 각각 다른 업체에 맡기지 않습니다. 하나의 전략과 하나의 예산으로 발견부터 수임까지 운영합니다.";

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
                        <Eyebrow>What we do</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[18ch]">
                            하나의 전략.
                            <br />
                            모든 채널.
                        </h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[600px]">
                            채널을 여섯 개로 나눠 파는 것이 아닙니다. 하나의 책임자가 하나의 예산으로
                            전부 운영하고, 성과는 같은 표에서 봅니다.
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* 6개 영역 */}
            <Section tight>
                <Container>
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px"
                        style={{ background: "var(--mt-line)" }}
                    >
                        {CHANNELS.map((c, i) => (
                            <Reveal key={c.key} index={i % 3}>
                                <Link
                                    href={path(c.href)}
                                    className="group flex flex-col h-full px-7 py-10 md:px-9 md:py-12"
                                    style={{ background: "var(--mt-bg)" }}
                                >
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                        {c.en}
                                    </p>
                                    <h2 className="mt-h3 mt-5">{c.title}</h2>
                                    <p className="mt-body mt-4 text-[14px]">{c.desc}</p>
                                    <span
                                        className="mt-auto pt-9 inline-flex items-center gap-1.5 text-[13px] font-medium"
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

            {/* 운영 시스템 — 홈 #system 과 같은 내용을 여기서도 볼 수 있게 */}
            <Section id="system" dark>
                <Container>
                    <SectionHeader
                        eyebrow="Our System"
                        title={
                            <>
                                고객이 로펌을 발견하는 순간부터
                                <br />
                                사건을 맡기는 순간까지.
                            </>
                        }
                    />
                    <ol className="mt-14">
                        {SYSTEM_STEPS.map((s, i) => (
                            <Reveal key={s.no} as="li" index={i % 3}>
                                <div
                                    className="grid grid-cols-1 md:grid-cols-[72px_260px_1fr] gap-x-8 gap-y-3 py-8"
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <span
                                        className="mt-en mt-num text-[12px] font-medium pt-1"
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
                                    <p className="mt-body max-w-[520px]">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </ol>
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />

                    <Reveal>
                        <div className="mt-14">
                            <Button href={path(PRIMARY_CTA.href)} variant="outline">
                                {PRIMARY_CTA.label} <span aria-hidden>→</span>
                            </Button>
                        </div>
                    </Reveal>
                </Container>
            </Section>
        </>
    );
}
