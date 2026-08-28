"use client";

import { Container, Button } from "../primitives";
import { useScrollProgress } from "../useScrollProgress";
import { PRIMARY_CTA, path } from "@/data/renewal/site";

// 서명란 — ONE BLUE THREAD 의 완성 (스크롤 진행형).
// "무료 체험"이 아니다. 진단이다(§34).
//
// HERO 에서 시작한 파란 실이 여기서 서명선이 된다:
// 라벨 → 제목 줄 단위 마스크 리빌 → 서명선이 좌→우로 그어짐 → CTA →
// 직인이 한 번 찍힌다(반복·흔들림 없음). 직인과 함께 전역 진행선도 100%.
// enter 진행(--p) 기반 — 역스크롤 역재생, 이탈 후 최종 상태 유지.

export default function FinalCTA() {
    const stageRef = useScrollProgress<HTMLDivElement>("enter");

    return (
        <section
            data-clause="서명란"
            className="mt-dark-glow"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <div ref={stageRef} className="mt-stage py-[88px] md:py-[140px]">
                <Container>
                    <div className="max-w-[820px]">
                        <p
                            className="mt-pi mt-en mt-label"
                            style={{ color: "var(--mt-gray)", ["--a" as string]: 0.05 }}
                        >
                            Signature
                        </p>

                        <h2 className="mt-serif mt-h1 mt-8" style={{ color: "var(--mt-bg)" }}>
                            <span className="mt-pmask" style={{ ["--a" as string]: 0.1 }}>
                                <span>로펌은 사건에 집중하십시오.</span>
                            </span>
                            <span className="mt-pmask" style={{ ["--a" as string]: 0.18 }}>
                                <span>마케팅은 메이크디스원이 끝까지 책임집니다.</span>
                            </span>
                        </h2>

                        <div className="mt-14 flex flex-col sm:flex-row sm:items-end gap-8 sm:gap-10">
                            <div className="flex-1 min-w-0">
                                <p
                                    className="mt-pi pb-2.5 text-[13.5px]"
                                    style={{ color: "var(--mt-gray)", ["--a" as string]: 0.34 }}
                                >
                                    위 계약의 범위를 확인하려면
                                </p>
                                {/* 서명선 — 파란 실이 좌→우로 그어진다 */}
                                <span
                                    className="mt-pline block h-px w-full"
                                    style={{ background: "var(--mt-bg)", ["--a" as string]: 0.4, ["--w" as string]: 0.12 }}
                                    aria-hidden="true"
                                />
                                <p
                                    className="mt-pi mt-en mt-2 text-[9.5px] font-medium"
                                    style={{ color: "var(--mt-gray)", ["--a" as string]: 0.46 }}
                                >
                                    Marketing Diagnosis Request
                                </p>
                            </div>

                            <div className="flex items-end gap-6">
                                {/* 진행형 opacity 위에 transition/hover-opacity 를 겹치지 않는다 —
                                    스크럽과 트랜지션이 같은 속성을 두고 싸운다 */}
                                <a
                                    href={path(PRIMARY_CTA.href)}
                                    className="mt-pi inline-flex items-center justify-center gap-2 h-[52px] px-7 text-[14px] font-medium rounded-[2px]"
                                    style={{
                                        background: "var(--mt-bg)",
                                        color: "var(--mt-dark-bg)",
                                        ["--a" as string]: 0.55,
                                        ["--o0" as string]: 0.35,
                                    }}
                                >
                                    우리 로펌 마케팅 진단받기 <span aria-hidden>→</span>
                                </a>
                                <span className="mt-stamp-mark mt-pstamp hidden sm:flex" aria-hidden>
                                    메이크
                                    <br />
                                    디스원
                                </span>
                            </div>
                        </div>

                        <div className="mt-pi mt-12 flex flex-col sm:flex-row gap-3" style={{ ["--a" as string]: 0.62 }}>
                            <Button href={path("/contact")} variant="outline">
                                제안 요청하기
                            </Button>
                        </div>

                        <p
                            className="mt-pi mt-14 text-[11.5px] leading-relaxed"
                            style={{ color: "var(--mt-gray)", ["--a" as string]: 0.8, ["--o0" as string]: 0.3 }}
                        >
                            본 페이지의 조·별지 구성은 서비스 구조를 설명하기 위한 편집 형식이며 실제 계약
                            문서가 아닙니다. 계약 조건과 범위는 상담 후 서면으로 정합니다.
                        </p>
                    </div>
                </Container>
            </div>
        </section>
    );
}
