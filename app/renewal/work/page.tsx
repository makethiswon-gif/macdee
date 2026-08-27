import type { Metadata } from "next";
import { Container, Section, Eyebrow, Button, ArrowLink } from "@/components/renewal/primitives";
import Reveal from "@/components/renewal/Reveal";
import CaseStudies from "@/components/renewal/home/CaseStudies";
import { CASES } from "@/data/renewal/cases";
import { PARTNERS, PROOF_STATS, PRIMARY_CTA, path } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

// Case Study.
//
// ⚠️ 확인된 성과 수치가 없으면 사례를 만들지 않는다(§42).
// 지금은 CASES 가 비어 있고, 그 사실을 숨기지 않고 그대로 쓴다.
// 숫자를 지어내는 것보다 "아직 공개할 수치가 없다"고 쓰는 편이 신뢰에 낫다.

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
                        <p className="mt-body-lg mt-8 max-w-[600px]">
                            로고를 모아두는 대신 구조를 공개합니다. 어떤 상태였고, 무엇을 했고, 어떤 지표가
                            움직였는지.
                        </p>
                    </Reveal>
                </Container>
            </section>

            {CASES.length > 0 ? (
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
                                    현재 상태
                                </p>
                                <h2 className="mt-h2 mt-6">공개할 수 있는 성과 수치를 정리하는 중입니다.</h2>
                                <div className="mt-9 flex flex-col gap-5">
                                    <p className="mt-body">
                                        마케팅 대행에서 성과 수치는 고객사의 영업 정보와 붙어 있습니다.
                                        공개하려면 어느 범위까지 밝힐 수 있는지 고객사와 먼저 합의해야 합니다.
                                        그 합의가 끝난 사례부터 순서대로 올립니다.
                                    </p>
                                    <p className="mt-body">
                                        그전까지는 숫자를 만들지 않습니다. 검색해서 나오는 로펌 마케팅 사례의
                                        상당수가 검증되지 않은 수치라는 점을 알고 있고, 거기에 하나를 더 보태지
                                        않으려 합니다.
                                    </p>
                                    <p className="mt-body">
                                        지금 확인하실 수 있는 것은 실제로 함께 일한 로펌 목록과, 어떤 방식으로
                                        운영하는지입니다. 구체적인 사례는 상담 자리에서 범위를 정해 말씀드립니다.
                                    </p>
                                </div>

                                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
                                    <ArrowLink href={path("/lawfirm-marketing")}>운영 방식 보기</ArrowLink>
                                    <ArrowLink href={path("/about")}>팀 보기</ArrowLink>
                                </div>
                            </div>
                        </Reveal>
                    </Container>
                </Section>
            )}

            {/* 실제로 확인 가능한 것 — 파트너와 공표 수치 */}
            <Section dark tight>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
                        <div>
                            <Reveal>
                                <Eyebrow>Selected Partners</Eyebrow>
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
                            <ul
                                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-px"
                                style={{ background: "var(--mt-line)" }}
                            >
                                {PARTNERS.map((p) => (
                                    <li
                                        key={p}
                                        className="flex items-center justify-center px-4 py-7 text-[13px] text-center"
                                        style={{ background: "var(--mt-dark-bg)", color: "var(--mt-gray)" }}
                                    >
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>

                    <Reveal index={3}>
                        <div className="mt-16">
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
