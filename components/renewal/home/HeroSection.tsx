import { Container, Button, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { HERO_CHANNELS, PRIMARY_CTA, path } from "@/data/renewal/site";

// SECTION 01 — 3초 안에 "무엇을 하는 회사인가"를 이해시킨다.
// 이미지도 일러스트도 없다. 타이포그래피 하나로 버틴다.

export default function HeroSection() {
    return (
        <section className="relative pt-[120px] md:pt-[160px] pb-16 md:pb-20 min-h-[88vh] flex flex-col justify-center">
            <Container>
                <Reveal>
                    <Eyebrow>Law Firm Marketing Department</Eyebrow>
                </Reveal>

                <Reveal index={1}>
                    <h1 className="mt-display mt-8 max-w-[16ch]">
                        로펌 마케팅,
                        <br />
                        여기서 끝냅니다.
                    </h1>
                </Reveal>

                <Reveal index={2}>
                    <p className="mt-body-lg mt-10 max-w-[560px]">
                        네이버 파워링크부터 Google Ads, 네이버 블로그와 홈페이지, SEO·GEO,
                        AI 검색과 상담 전환 분석까지.
                        <br className="hidden sm:block" />
                        <strong className="font-semibold" style={{ color: "var(--mt-ink)" }}>
                            MAKETHIS1이 하나의 마케팅팀처럼 전부 운영합니다.
                        </strong>
                    </p>
                </Reveal>

                <Reveal index={3}>
                    <div className="mt-12 flex flex-col sm:flex-row gap-3">
                        <Button href={PRIMARY_CTA.href} variant="primary">
                            우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                        </Button>
                        <Button href={path("/lawfirm-marketing") + "#system"} variant="outline">
                            운영 시스템 보기
                        </Button>
                    </div>
                </Reveal>
            </Container>

            {/* 채널 표기 — 로고를 늘어놓지 않는다(§6). 텍스트로 담백하게. */}
            <Container className="mt-20 md:mt-28">
                <Reveal index={4}>
                    <div className="pt-8" style={{ borderTop: "1px solid var(--mt-line)" }}>
                        <ul className="flex flex-wrap gap-x-8 gap-y-3 md:gap-x-12">
                            {HERO_CHANNELS.map((c) => (
                                <li
                                    key={c}
                                    className="mt-en text-[11px] font-medium"
                                    style={{ color: "var(--mt-gray-light)" }}
                                >
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
