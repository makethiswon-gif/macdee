import { Container, Section, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { PRIMARY_CTA, path } from "@/data/renewal/site";

// SECTION 10 — 마지막 CTA.
// "무료 체험"이 아니다. 진단이다(§34).

export default function FinalCTA() {
    return (
        <Section dark>
            <Container>
                <div className="max-w-[760px]">
                    <Reveal>
                        <Eyebrow>Start here</Eyebrow>
                    </Reveal>

                    <Reveal index={1}>
                        <h2 className="mt-h1 mt-8">
                            로펌은 사건에 집중하십시오.
                            <br />
                            마케팅은 하나의 팀이 끝까지 관리합니다.
                        </h2>
                    </Reveal>

                    <Reveal index={2}>
                        <p className="mt-body-lg mt-9 max-w-[560px]">
                            현재 운영 중인 광고, 블로그, 홈페이지를 함께 분석해 어디에서 고객이 빠져나가고
                            있는지 먼저 확인합니다.
                        </p>
                    </Reveal>

                    <Reveal index={3}>
                        <div className="mt-12 flex flex-col sm:flex-row gap-3">
                            <a
                                href={path(PRIMARY_CTA.href)}
                                className="inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[14px] font-medium rounded-[2px] transition-opacity hover:opacity-85"
                                style={{ background: "var(--mt-bg)", color: "var(--mt-dark-bg)" }}
                            >
                                우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                            </a>
                            <Button href={path("/contact")} variant="outline">
                                제안 요청하기
                            </Button>
                        </div>
                    </Reveal>
                </div>
            </Container>
        </Section>
    );
}
