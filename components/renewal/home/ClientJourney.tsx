"use client";

import Link from "next/link";
import { Container } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import { JOURNEY, path } from "@/data/renewal/site";

// 제2조 — 의뢰인 여정 (ONE BLUE THREAD).
//
// 카드 3장 fade-in 이 아니라, 한 명의 의뢰인(파란 점)이
// 발견 → 선택할 이유 → 상담 → LEAD TO CASE 로 이동하는 이야기다.
// 카드 상단 검은 선이 이동 경로가 되고 그 위로 파란 진행선이 그어진다.
//
// 데스크톱: 165svh 스크롤 무대(sticky), 모든 상태가 --p 의 순수 함수라
//   빠른 스크롤 즉시 반영·역스크롤 자연 역재생·이탈 후 최종 상태 유지.
// 모바일: sticky 없이 enter 진행 — 카드 왼쪽 세로 선을 따라 점이 내려간다.
// reduced-motion / JS 실패: --p=1 → 최종 완성 상태가 그대로 보인다.
// 장식(점·선·SVG)은 전부 aria-hidden. 카피는 실제 DOM 텍스트다.

const A = [0.06, 0.32, 0.58]; // 카드별 활성 시작 p
const LEAD_A = 0.82;

// 진행 아이템 헬퍼 — 클래스 + 시작점만 넘긴다
function pi(a: number, extra: Record<string, string | number> = {}) {
    return { ["--a" as string]: a, ...extra };
}

function SearchScene() {
    // 01 — 작은 검색 장면: 광고/일반 검색/AI 검색이 "우리 로펌" 결과로 정렬된다
    const rows = [
        { label: "광고", top: 0, my: 26 },
        { label: "일반 검색", top: 26, my: 0 },
        { label: "AI 검색", top: 52, my: -26 },
    ];
    return (
        <div
            className="mt-6 p-4 rounded-[2px] text-[12px]"
            style={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)" }}
        >
            <p className="mt-pi flex items-baseline gap-2" style={pi(0.1)}>
                <span className="mt-en text-[9px] font-medium" style={{ color: "var(--mt-gray)" }}>
                    Search
                </span>
                <span style={{ color: "var(--mt-ink)" }}>내 상황과 비슷한 법률 문제</span>
            </p>
            <div className="relative mt-3 h-[72px]" aria-hidden="true">
                {rows.map((r, i) => (
                    <span
                        key={r.label}
                        className="mt-jsr absolute left-0 right-0 px-3 py-[5px] rounded-[2px]"
                        style={{
                            top: r.top,
                            border: "1px solid var(--mt-line)",
                            color: "var(--mt-gray)",
                            ["--a" as string]: 0.13 + i * 0.025,
                            ["--am" as string]: 0.215,
                            ["--my" as string]: `${r.my}px`,
                        }}
                    >
                        {r.label}
                    </span>
                ))}
                <span
                    className="mt-pi absolute left-0 right-0 top-[26px] px-3 py-[5px] rounded-[2px] font-medium"
                    style={{
                        border: "1px solid var(--mt-accent)",
                        color: "var(--mt-accent)",
                        ...pi(0.235, { ["--w" as string]: 0.03 }),
                    }}
                >
                    우리 로펌
                </span>
            </div>
        </div>
    );
}

function HomepageScene() {
    // 02 — 정보 조각이 한 장의 홈페이지처럼 정렬된다
    const pieces = ["사건 경험", "전문 콘텐츠", "자주 묻는 질문", "상담 안내"];
    return (
        <div
            className="mt-4 p-3 rounded-[2px] text-[11.5px]"
            style={{ background: "var(--mt-surface)", border: "1px solid var(--mt-line)" }}
        >
            <p
                className="mt-pi px-3 py-[6px] font-medium rounded-[2px]"
                style={{
                    background: "var(--mt-bg)",
                    border: "1px solid var(--mt-line-strong)",
                    color: "var(--mt-ink)",
                    ...pi(0.37),
                }}
            >
                변호사 소개
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
                {pieces.map((label, i) => (
                    <li
                        key={label}
                        className="mt-pi px-3 py-[5px] rounded-[2px]"
                        style={{
                            border: "1px solid var(--mt-line)",
                            color: "var(--mt-gray)",
                            ...pi(0.395 + i * 0.022),
                        }}
                    >
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ContactScene() {
    // 03 — 전화/카카오/상담폼이 서로 다른 방향에서 상담 노드로 합쳐진다
    const routes = [
        { label: "전화", sx: -78, sy: -16 },
        { label: "카카오", sx: 78, sy: -20 },
        { label: "상담폼", sx: -8, sy: 36 },
    ];
    const sample = [
        ["유입 채널", "검색광고"],
        ["사건 분야", "이혼"],
        ["문의 경로", "전화"],
    ];
    return (
        <div className="mt-6">
            <div className="relative h-[64px]" aria-hidden="true">
                {routes.map((r, i) => (
                    <span
                        key={r.label}
                        className="mt-jconv absolute left-1/2 top-1/2 -ml-8 -mt-3 w-16 text-center px-1 py-[4px] text-[11px] rounded-[2px]"
                        style={{
                            border: "1px solid var(--mt-line)",
                            background: "var(--mt-surface)",
                            color: "var(--mt-gray)",
                            ["--sx" as string]: `${r.sx}px`,
                            ["--sy" as string]: `${r.sy}px`,
                            ["--a" as string]: 0.61 + i * 0.02,
                            ["--am" as string]: 0.665,
                        }}
                    >
                        {r.label}
                    </span>
                ))}
                <span
                    className="mt-pi absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-[5px] text-[12px] font-medium rounded-[2px]"
                    style={{
                        border: "1px solid var(--mt-accent)",
                        background: "var(--mt-surface)",
                        color: "var(--mt-accent)",
                        ...pi(0.67, { ["--w" as string]: 0.03 }),
                    }}
                >
                    상담
                </span>
            </div>
            {/* 예시 데이터 — 실제 고객 정보가 아니다 */}
            <dl className="mt-3 text-[11.5px]" style={{ border: "1px solid var(--mt-line)", borderRadius: 2 }}>
                {sample.map(([k, v], i) => (
                    <div
                        key={k}
                        className="mt-pi flex justify-between px-3 py-[5px]"
                        style={{
                            borderTop: i ? "1px solid var(--mt-line)" : "none",
                            ...pi(0.71 + i * 0.02),
                        }}
                    >
                        <dt style={{ color: "var(--mt-gray)" }}>{k}</dt>
                        <dd className="font-medium" style={{ color: "var(--mt-ink)" }}>
                            {v}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

const SCENES = [SearchScene, HomepageScene, ContactScene];
const BADGE_A = [0.25, 0.47, 0.76]; // 카드별 기존 배지 등장 시작

export default function ClientJourney() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section id="system" data-clause="제2조" className="pt-[88px] md:pt-[140px] pb-[88px] md:pb-[140px]">
            <Container>
                {/* 섹션 진입 — 제목 줄 단위 마스크 리빌 */}
                <div className="max-w-[820px]">
                    <div className="flex items-center gap-3 mb-6">
                        <Reveal as="span" variant="rise">
                            <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                                제2조
                            </span>
                        </Reveal>
                        <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                        <Reveal as="span" variant="rise" index={1}>
                            <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                Client Journey
                            </span>
                        </Reveal>
                    </div>
                    <h2 className="mt-h2 mt-serif" style={{ color: "var(--mt-ink)" }}>
                        <Reveal as="span" variant="mask">
                            <span className="block">한 의뢰인이 로펌을 발견하고</span>
                        </Reveal>
                        <Reveal as="span" variant="mask" index={1} stagger={140}>
                            <span className="block">사건을 맡기기까지.</span>
                        </Reveal>
                    </h2>
                    <Reveal variant="rise" index={2} stagger={160}>
                        <p className="mt-body-lg mt-7 max-w-[640px]">
                            우리가 관리하는 것은 의뢰인이 로펌을 찾는 모든 과정입니다.
                        </p>
                    </Reveal>
                </div>
            </Container>

            {/* ── 스크롤 무대 ── */}
            <div ref={stageRef} className="mt-stage mt-stage-track lg:h-[165svh]">
                <div className="mt-stage-pin">
                    <Container className="pt-14 lg:pt-0">
                        <div className="relative pl-7 lg:pl-0">
                            {/* 모바일: 세로 경로 */}
                            <div className="lg:hidden absolute left-1 top-2 bottom-2" aria-hidden="true">
                                <span className="mt-jvline" />
                                <span className="mt-jvfill" />
                                <span className="mt-jvdot">
                                    <span className="mt-jdot-label" style={{ top: "auto", left: 18, transform: "none" }}>
                                        의뢰인
                                    </span>
                                </span>
                            </div>

                            {/* 데스크톱: 카드 상단 검은 선 위의 파란 진행선 + 의뢰인 점 */}
                            <div className="hidden lg:block absolute -top-0 left-0 right-0 h-0 z-10" aria-hidden="true">
                                <span
                                    className="mt-jtrack-fill absolute left-0 top-0 h-[2px]"
                                    style={{ background: "var(--mt-accent)" }}
                                />
                                <span className="mt-jdot">
                                    <span className="mt-jdot-label">의뢰인</span>
                                </span>
                            </div>

                            <ol className="grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-10">
                                {JOURNEY.map((step, i) => {
                                    const Scene = SCENES[i];
                                    return (
                                        <li
                                            key={step.no}
                                            className="mt-jcard h-full pt-7"
                                            style={{
                                                borderTop: "2px solid var(--mt-ink)",
                                                ["--a" as string]: A[i],
                                            }}
                                        >
                                            <p className="mt-en mt-num text-[11px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                                {step.no}
                                            </p>
                                            <h3
                                                className="mt-serif mt-4 text-[clamp(1.25rem,1.9vw,1.55rem)] font-semibold leading-[1.4]"
                                                style={{ color: "var(--mt-ink)" }}
                                            >
                                                {step.title}
                                            </h3>
                                            <p className="mt-body mt-3 text-[14px] max-w-[40ch]">{step.desc}</p>

                                            {i === 1 && (
                                                <p className="mt-pi mt-4 text-[12.5px]" style={{ color: "var(--mt-gray)", ...pi(0.36) }}>
                                                    검색됐다는 이유만으로 선택하지는 않습니다.
                                                </p>
                                            )}

                                            <Scene />

                                            {i === 1 && (
                                                <p
                                                    className="mt-pi mt-4 text-[12.5px] font-medium"
                                                    style={{ color: "var(--mt-ink)", ...pi(0.45) }}
                                                >
                                                    이 로펌이어야 할 이유를 확인합니다.
                                                </p>
                                            )}

                                            <ul className="mt-5 flex flex-wrap gap-2">
                                                {step.labels.map((l, j) => (
                                                    <li
                                                        key={l}
                                                        className="mt-pi text-[11.5px] px-2.5 pt-[5px] pb-[4px] rounded-[2px]"
                                                        style={{
                                                            border: "1px solid var(--mt-line-strong)",
                                                            color: "var(--mt-gray)",
                                                            ...pi(BADGE_A[i] + j * 0.015, { ["--w" as string]: 0.025 }),
                                                        }}
                                                    >
                                                        {l}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    );
                                })}
                            </ol>

                            {/* 03 → LEAD TO CASE 로 내려가는 커넥터 (데스크톱) */}
                            <div className="hidden lg:block relative h-11" aria-hidden="true">
                                <span
                                    className="mt-jdrop-line absolute top-0 bottom-0 w-px"
                                    style={{ left: "83.3%", background: "var(--mt-accent)" }}
                                />
                                <span className="absolute top-0 bottom-0" style={{ left: "83.3%" }}>
                                    <span className="mt-jdot mt-jdrop-dot" />
                                </span>
                            </div>

                            {/* LEAD TO CASE */}
                            <div
                                className="mt-pi relative mt-10 lg:mt-0 px-7 py-8 md:px-9 rounded-[2px]"
                                style={{
                                    background: "var(--mt-surface)",
                                    border: "1px solid var(--mt-line)",
                                    ...pi(LEAD_A, { ["--o0" as string]: 0.55, ["--dy" as string]: "0px" }),
                                }}
                            >
                                {/* 데이터 피드백 루프 — 앞 단계로 돌아가는 얇은 점선 */}
                                <svg
                                    className="mt-jloop hidden lg:block absolute pointer-events-none"
                                    style={{ left: -46, top: -320, width: 46, height: 420 }}
                                    viewBox="0 0 46 420"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M 44 400 C 4 380, 4 40, 44 12"
                                        fill="none"
                                        stroke="var(--mt-accent)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength={1}
                                    />
                                </svg>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                                        Lead to Case
                                    </span>
                                    <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                                    <span className="mt-pi flex items-center gap-3 text-[14px] font-medium" style={{ color: "var(--mt-ink)", ...pi(0.84) }}>
                                        전화 · 카카오 · 폼
                                        <span aria-hidden style={{ color: "var(--mt-accent)" }}>→</span>
                                    </span>
                                    <span className="mt-pi text-[14px] font-medium" style={{ color: "var(--mt-ink)", ...pi(0.86) }}>
                                        상담
                                    </span>
                                    <span className="mt-pi mt-dashseg" style={pi(0.88)} aria-hidden />
                                    <span className="mt-pi text-[14px] font-medium" style={{ color: "var(--mt-ink)", ...pi(0.88) }}>
                                        수임
                                    </span>
                                    <span className="mt-pi text-[11px]" style={{ color: "var(--mt-gray)", ...pi(0.9) }}>
                                        수임 결과는 로펌이 제공한 범위에서 연결
                                    </span>
                                </div>

                                <p className="mt-body mt-4 text-[13.5px] max-w-[70ch]">
                                    유입이 어느 채널에서 왔는지 구분하고, 채널별 비용과 상담 기여를 같은 표에서
                                    봅니다. 그 표를 근거로 다음 달 예산을 옮깁니다.
                                </p>

                                {/* 데이터 흐름 — 다시 전략과 예산으로 */}
                                <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px]">
                                    {["유입 확인", "유효상담 분석", "다음 달 예산 조정"].map((f, i) => (
                                        <span key={f} className="flex items-center gap-2.5">
                                            {i > 0 && (
                                                <span aria-hidden style={{ color: "var(--mt-accent)" }}>
                                                    →
                                                </span>
                                            )}
                                            <span
                                                className="mt-pi px-2.5 py-[4px] rounded-[2px]"
                                                style={{
                                                    border: "1px solid var(--mt-line)",
                                                    color: "var(--mt-charcoal)",
                                                    ...pi(0.9 + i * 0.02),
                                                }}
                                            >
                                                {f}
                                            </span>
                                        </span>
                                    ))}
                                    <span className="mt-pi text-[11px]" style={{ color: "var(--mt-accent)", ...pi(0.96) }}>
                                        ↺ 다음 전략과 예산으로
                                    </span>
                                </div>

                                <div className="mt-5">
                                    <Link
                                        href={path("/conversion")}
                                        className="mt-plink group inline-flex items-center gap-2 text-[14px] font-medium"
                                        style={{ color: "var(--mt-ink)" }}
                                    >
                                        <span className="relative">
                                            데이터 운영 방식 보기
                                            <span className="mt-plink-bar" style={pi(0.97)} aria-hidden />
                                        </span>
                                        <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
                                            →
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Container>
                </div>
            </div>
        </section>
    );
}
