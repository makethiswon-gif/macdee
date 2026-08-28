import { Container, Section, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { PRIMARY_CTA, path } from "@/data/renewal/site";

// 서명란 — 마지막 CTA (The Contract 개편).
// "무료 체험"이 아니다. 진단이다(§34).
//
// 계약서의 끝은 서명란이다. 선언(세리프) 아래 서명선과 진단 CTA, 그리고 직인.
// 직인 레드(--mt-stamp-on-dark)는 사이트 전체에서 여기 한 곳에만 등장한다.
// 조·별지 구성이 실제 계약 문서로 오인되지 않도록 안내 한 줄을 함께 둔다(§42).

export default function FinalCTA() {
    return (
        <Section dark>
            <Container>
                <div className="max-w-[820px]">
                    <Reveal>
                        <Eyebrow>Signature</Eyebrow>
                    </Reveal>

                    <Reveal index={1}>
                        <h2 className="mt-serif mt-h1 mt-8">
                            로펌은 사건에 집중하십시오.
                            <br />
                            마케팅은 메이크디스원이 끝까지 책임집니다.
                        </h2>
                    </Reveal>

                    <Reveal index={2}>
                        <div className="mt-14 flex flex-col sm:flex-row sm:items-end gap-8 sm:gap-10">
                            <div className="flex-1 min-w-0">
                                <p
                                    className="pb-2.5 text-[13.5px]"
                                    style={{ color: "var(--mt-gray)", borderBottom: "1px solid var(--mt-bg)" }}
                                >
                                    위 계약의 범위를 확인하려면
                                </p>
                                <p className="mt-en mt-2 text-[9.5px] font-medium" style={{ color: "var(--mt-gray)" }}>
                                    Marketing Diagnosis Request
                                </p>
                            </div>

                            <div className="flex items-end gap-6">
                                <a
                                    href={path(PRIMARY_CTA.href)}
                                    className="inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[14px] font-medium rounded-[2px] transition-opacity hover:opacity-85"
                                    style={{ background: "var(--mt-bg)", color: "var(--mt-dark-bg)" }}
                                >
                                    우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                                </a>
                                <span className="mt-stamp-mark hidden sm:flex" aria-hidden>
                                    메이크
                                    <br />
                                    디스원
                                </span>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal index={3}>
                        <div className="mt-12 flex flex-col sm:flex-row gap-3">
                            <Button href={path("/contact")} variant="outline">
                                제안 요청하기
                            </Button>
                        </div>
                    </Reveal>

                    <Reveal index={4}>
                        <p className="mt-14 text-[11.5px] leading-relaxed" style={{ color: "var(--mt-gray)" }}>
                            본 페이지의 조·별지 구성은 서비스 구조를 설명하기 위한 편집 형식이며 실제 계약
                            문서가 아닙니다. 계약 조건과 범위는 상담 후 서면으로 정합니다.
                        </p>
                    </Reveal>
                </div>
            </Container>
        </Section>
    );
}
