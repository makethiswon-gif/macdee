import type { Metadata } from "next";
import { Container, Section, Eyebrow, Button, ArrowLink } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import PartnerGroups from "@/components/renewal/PartnerGroups";
import { CASES } from "@/data/renewal/cases";
import { PROOF_STATS, PRIMARY_CTA, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

// Work.
//
// ⚠️ 확인된 성과 수치가 없으면 사례를 만들지 않는다(§42). CASES 는 지금 비어 있고,
//    그 사실을 숨기지 않는다.
// 다만 페이지의 중심은 "사례가 없다는 사과"가 아니라 "검증 가능한 근거"다.
//    공표 수치(20+/100+/7년+)와 실제 고객 목록을 먼저 보여주고,
//    공개 사례는 고객사 동의 범위에서 순차 공개한다는 원칙을 짧게 밝힌다.
//    경쟁사 사례를 일반화해 깎아내리지 않는다.

const URL = "https://www.makethis1.com/renewal/work";
const TITLE = "Case Study | MAKETHIS1";
const DESC =
    "무엇을 바꿨고 무엇이 달라졌는지 구조를 공개합니다. 측정된 수치가 확인된 사례부터 순차적으로 등록합니다.";

export const metadata: Metadata = {
    title: { absolute: TITLE },
    description: DESC,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: { title: TITLE, description: DESC, url: URL, type: "website", locale: "ko_KR" },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function Page() {
    const hasCases = CASES.length > 0;

    return (
        <>
            <section className="pt-[120px] md:pt-[168px] pb-14 md:pb-20">
                <Container>
                    <Reveal>
                        <Eyebrow>Work</Eyebrow>
                    </Reveal>
                    <Reveal index={1}>
                        <h1 className="mt-h1 mt-7 max-w-[20ch]">무엇을 바꿨고, 무엇이 달라졌는지.</h1>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-8 max-w-[620px]">
                            보여드릴 수 있는 근거부터 공개합니다. 함께한 로펌과 기업, 7년간 이어온 운영이
                            먼저 있습니다. 개별 성과는 고객사가 동의한 범위에서 사례로 정리해 나갑니다.
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* 첫 본문 — 검증 가능한 근거: 공표 수치 + 실제 고객(로펌/기업 구분) */}
            <Section dark tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
                        <div>
                            <Reveal>
                                <Eyebrow>Selected Clients</Eyebrow>
                            </Reveal>
                            <Reveal index={1}>
                                <div className="mt-10 flex flex-row lg:flex-col gap-10 lg:gap-8 flex-wrap">
                                    {PROOF_STATS.map((s) => (
                                        <div key={s.label}>
                                            <div className="flex items-baseline gap-0.5">
                                                <span
                                                    className="mt-num text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-none tracking-tight"
                                                    style={{ color: "var(--mt-bg)" }}
                                                >
                                                    {s.value}
                                                </span>
                                                <span
                                                    className="text-[1rem] font-medium"
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
                        </div>

                        <Reveal index={2}>
                            <PartnerGroups />
                        </Reveal>
                    </div>
                </Container>
            </Section>

            {hasCases ? (
                <CaseStudies cases={CASES} />
            ) : (
                <Section tight>
                    <Container>
                        <Reveal>
                            <div
                                className="pt-12 max-w-[720px]"
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                            >
                                <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                    Case Studies
                                </p>
                                <h2 className="mt-h2 mt-6">공개 사례는 고객사 동의 범위에서 정리합니다.</h2>
                                <p className="mt-body mt-8 max-w-[620px]">
                                    성과 수치는 고객사의 영업 정보와 맞닿아 있어, 공개 범위를 먼저 합의한
                                    사례부터 순서대로 등록합니다. 지금 확인이 필요하시면 상담에서 공개 가능한
                                    범위의 사례를 직접 보여드립니다.
                                </p>

                                <div className="mt-11 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-9">
                                    <Button href={path(PRIMARY_CTA.href)}>
                                        {PRIMARY_CTA.label} <span aria-hidden>→</span>
                                    </Button>
                                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                                        <ArrowLink href={path("/lawfirm-marketing")}>운영 방식 보기</ArrowLink>
                                        <ArrowLink href={path("/about")}>팀 보기</ArrowLink>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </Container>
                </Section>
            )}
        </>
    );
}
