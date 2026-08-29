"use client";

import { Container } from "../primitives";
import { useScrollProgress } from "../useScrollProgress";
import { PRIMARY_CTA, path } from "@/data/renewal/site";

// 최종 CTA — ONE BLUE THREAD 의 완성 (스크롤 진행형).
// "무료 체험"이 아니다. 진단이다(§34).
//
// 라벨 → 제목 줄 단위 마스크 리빌 → 파란 실이 좌→우로 그어짐 → CTA.
// enter 진행(--p) 기반 — 역스크롤 역재생, 이탈 후 최종 상태 유지.

export default function FinalCTA() {
    const stageRef = useScrollProgress<HTMLDivElement>("enter");

    return (
        <section
            data-clause="CONTACT"
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
                            Contact
                        </p>

                        <h2 className="mt-serif mt-h1 mt-8" style={{ color: "var(--mt-bg)" }}>
                            {/* 모바일에서 "로펌은 사건에 / 집중하십시오."로 꺾이는 것은 자연스러운
                                한국어 행갈이 — 뒤 단어를 묶으면 "로펌은"이 외톨이가 되어 더 나쁘다 */}
                            <span className="mt-pmask" style={{ ["--a" as string]: 0.1 }}>
                                <span>로펌은 사건에 집중하십시오.</span>
                            </span>
                            <span className="mt-pmask" style={{ ["--a" as string]: 0.18 }}>
                                <span>마케팅은 저희가 맡겠습니다.</span>
                            </span>
                        </h2>

                        <p
                            className="mt-pi mt-8 text-[15px] leading-[1.8] max-w-[560px]"
                            style={{ color: "var(--mt-gray)", ["--a" as string]: 0.3 }}
                        >
                            현재 마케팅 상태와 예산을 알려주시면
                            <br className="hidden sm:block" /> 세 가지 운영안 중 맞는 구성을 제안합니다.
                        </p>

                        {/* 파란 실 — HERO 에서 시작한 선이 여기서 끝난다 */}
                        <span
                            className="mt-pline block h-px w-full mt-12"
                            style={{ background: "var(--mt-bg)", ["--a" as string]: 0.42, ["--w" as string]: 0.12 }}
                            aria-hidden="true"
                        />

                        <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-5">
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
                                마케팅 진단 요청 <span aria-hidden>→</span>
                            </a>
                            <a
                                href={path("/#plans")}
                                className="mt-pi text-[13.5px] font-medium underline-offset-4 hover:underline"
                                style={{ color: "var(--mt-gray)", ["--a" as string]: 0.62 }}
                            >
                                세 가지 운영안 다시 보기
                            </a>
                        </div>
                    </div>
                </Container>
            </div>
        </section>
    );
}
