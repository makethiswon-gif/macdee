import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";

// SECTION 05 — 차별화 지점.
// "새 플랫폼이 나오면 새 대행사를 찾아야 하는가"에 대한 답.
//
// ⚠️ 표현 주의(§42): ChatGPT Ads가 지금 법률서비스에 자유롭게 집행 가능한 것처럼
// 읽히면 안 된다. 조건절과 disclaimer를 반드시 함께 둔다.

const TIMELINE = [
    { en: "TODAY", ko: "네이버 · 구글 검색광고", state: "운영 중" },
    { en: "NOW SHIFTING", ko: "AI 검색 · 생성형 답변", state: "구조 대응 중" },
    { en: "NEXT", ko: "새로운 AI 광고 채널", state: "검증 후 편입" },
];

export default function FutureReady() {
    return (
        <Section dark>
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-20">
                    <div>
                        <SectionHeader
                            number="04"
                            eyebrow="Future Ready"
                            title={
                                <>
                                    검색과 광고가 바뀌어도
                                    <br />
                                    마케팅 시스템은 멈추지 않아야 합니다.
                                </>
                            }
                        />

                        <Reveal index={1}>
                            <div className="mt-10 flex flex-col gap-6 max-w-[520px]">
                                <p className="mt-body-lg">
                                    오늘 중요한 채널이 내일도 중요하다는 보장은 없습니다.
                                </p>
                                <p className="mt-body">
                                    네이버 검색이 변하고, Google 검색이 AI 중심으로 옮겨가고,
                                    ChatGPT와 새로운 AI 플랫폼이 고객과 기업의 새로운 접점이 되고 있습니다.
                                </p>
                                <p className="mt-body-lg">
                                    <strong className="font-semibold" style={{ color: "var(--mt-bg)" }}>
                                        MAKETHIS1은 특정 플랫폼 하나를 판매하지 않습니다.
                                    </strong>{" "}
                                    새로운 검색과 광고 채널이 등장하면 검증하고, 기존 마케팅 시스템에
                                    연결합니다.
                                </p>
                            </div>
                        </Reveal>
                    </div>

                    <div className="lg:pt-4">
                        <ul>
                            {TIMELINE.map((t, i) => (
                                <Reveal key={t.en} as="li" index={i}>
                                    <div
                                        className="flex items-baseline justify-between gap-6 py-6"
                                        style={{ borderTop: "1px solid var(--mt-line)" }}
                                    >
                                        <div>
                                            <p className="mt-en mt-label mb-2" style={{ color: "var(--mt-gray)" }}>
                                                {t.en}
                                            </p>
                                            <p className="text-[15px]" style={{ color: "var(--mt-bg)" }}>
                                                {t.ko}
                                            </p>
                                        </div>
                                        <span
                                            className="text-[12px] shrink-0"
                                            style={{ color: "var(--mt-gray)" }}
                                        >
                                            {t.state}
                                        </span>
                                    </div>
                                </Reveal>
                            ))}
                        </ul>

                        <Reveal index={3}>
                            <div
                                className="mt-10 px-7 py-8"
                                style={{ border: "1px solid var(--mt-line)" }}
                            >
                                <p className="text-[15px] leading-[1.75]" style={{ color: "var(--mt-bg)" }}>
                                    ChatGPT Ads를 포함한 새로운 AI 광고 채널까지.
                                </p>
                                <p className="mt-body mt-4 text-[13.5px]">
                                    각 플랫폼에서 법률서비스 광고가 가능해지고 실질적인 광고 채널로 활용할 수
                                    있는 시점부터 검토하여 기존 캠페인 시스템에 편입합니다.
                                </p>
                                <p
                                    className="mt-6 text-[11.5px] leading-relaxed"
                                    style={{ color: "var(--mt-gray)" }}
                                >
                                    * 광고 집행 가능 여부와 운영 범위는 각 플랫폼의 정책 및 승인 조건에 따라
                                    달라질 수 있습니다.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </Container>
        </Section>
    );
}
