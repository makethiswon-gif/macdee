import { Container, Section, Eyebrow, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { path } from "@/data/renewal/site";

// 홈에서는 짧게만 말한다.
//
// 이전 버전은 ChatGPT Ads 설명과 면책 문구까지 홈에 다 있었다.
// 아직 오지 않은 채널 이야기가 실제 성과·운영 증거보다 큰 자리를 차지하면
// "미래를 파는 회사"로 읽힌다. 상세 설명과 면책은 상세 페이지 쪽으로 옮긴다.

const TIMELINE = [
    { en: "TODAY", ko: "네이버 · 구글 검색광고", state: "운영 중" },
    { en: "NOW SHIFTING", ko: "AI 검색 · 생성형 답변", state: "구조 대응 중" },
    { en: "NEXT", ko: "새로운 AI 광고 채널", state: "검증 후 편입" },
];

export default function FutureReady() {
    return (
        <Section tight>
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-20 lg:items-center">
                    <div>
                        <Reveal>
                            <Eyebrow>Future Ready</Eyebrow>
                        </Reveal>
                        <Reveal index={1}>
                            <h2 className="mt-h3 mt-6 max-w-[24ch] leading-[1.5]">
                                검색과 광고 채널이 바뀌어도 새로운 기회를 검증해 기존 마케팅 시스템에
                                연결합니다.
                            </h2>
                        </Reveal>
                        <Reveal index={2}>
                            <p className="mt-body mt-6 max-w-[460px]">
                                특정 플랫폼 하나를 판매하지 않습니다. 새 채널이 등장할 때마다 대행사를 새로
                                찾을 필요가 없다는 뜻입니다.
                            </p>
                        </Reveal>
                        <Reveal index={3}>
                            <div className="mt-8">
                                <ArrowLink href={path("/geo")}>AI 검색 대응 방식 보기</ArrowLink>
                            </div>
                        </Reveal>
                    </div>

                    <ul>
                        {TIMELINE.map((t, i) => (
                            <Reveal key={t.en} as="li" index={i}>
                                <div
                                    className="flex items-baseline justify-between gap-6 py-5"
                                    style={{ borderTop: "1px solid var(--mt-line)" }}
                                >
                                    <div>
                                        <p className="mt-en mt-label mb-2" style={{ color: "var(--mt-gray)" }}>
                                            {t.en}
                                        </p>
                                        <p className="text-[14.5px]">{t.ko}</p>
                                    </div>
                                    <span className="text-[12px] shrink-0" style={{ color: "var(--mt-gray)" }}>
                                        {t.state}
                                    </span>
                                </div>
                            </Reveal>
                        ))}
                        <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                    </ul>
                </div>
            </Container>
        </Section>
    );
}
