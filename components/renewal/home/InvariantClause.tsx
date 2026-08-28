"use client";

import { Container } from "../primitives";
import Reveal from "../Reveal";
import { useScrollProgress } from "../useScrollProgress";
import {
    INVARIANT_LINES,
    INVARIANT_HOLD,
    INVARIANT_CLOSE,
    CHANNEL_LEDGER,
    LEDGER_FOOTNOTE,
} from "@/data/renewal/site";

// 제3조 — 변해도 조항 (The Contract 개편, FutureReady 대체).
//
// 이 페이지의 강한 연출 #2 (§18 — 3개 상한: 수렴 / 이 시퀀스 / 데이터 흐름).
// 스크롤에 따라 "…변해도." 줄이 하나씩 살아나고, 지나간 줄은 흐리게 남아
// 리듬이 쌓인다. 고정 선언("계약은 하나입니다")은 처음부터 끝까지 보인다.
//
// 구현은 기존 인프라 그대로 — useScrollProgress 가 --p 를 쓰고
// 나머지는 renewal.css 의 .mt-inv 가 CSS 로 처리한다. 새 라이브러리 없음.
// 이어지는 채널 장부(ledger)는 §42 원칙의 화면 버전이다:
// 운영 중 / 조건부 / 대기 / 관찰을 구분해 적는다.

const N = INVARIANT_LINES.length;

function StatusPill({ status }: { status: string }) {
    const active = status === "운영 중";
    return (
        <span
            className="mt-en inline-block px-2 pt-[4px] pb-[3px] text-[9.5px] font-medium rounded-[2px] whitespace-nowrap"
            style={{
                border: `1px solid ${active ? "var(--mt-accent)" : "var(--mt-line)"}`,
                color: active ? "var(--mt-accent)" : "var(--mt-gray)",
            }}
        >
            {status}
        </span>
    );
}

export default function InvariantClause() {
    const stageRef = useScrollProgress<HTMLDivElement>();

    return (
        <section
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
            <Container className="pt-[88px] md:pt-[140px]">
                <div className="flex items-center gap-3">
                    <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                        제3조
                    </span>
                    <span className="w-6 h-px" style={{ background: "var(--mt-line)" }} />
                    <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                        Whatever Changes
                    </span>
                </div>
            </Container>

            {/* ── 선언 시퀀스 ── */}
            <div
                ref={stageRef}
                className="mt-stage mt-stage-track mt-inv lg:h-[230svh]"
                style={{ ["--n" as string]: N }}
            >
                <div className="mt-stage-pin">
                    <Container>
                        <div className="py-16 lg:py-0">
                            {INVARIANT_LINES.map((line, i) => (
                                <p
                                    key={line}
                                    className="mt-inv-line mt-serif font-semibold text-[clamp(1.4rem,3.6vw,2.4rem)] leading-[1.55] m-0"
                                    style={{ ["--i" as string]: i, color: "var(--mt-bg)" }}
                                >
                                    {line}
                                </p>
                            ))}
                            <p
                                className="mt-serif font-semibold text-[clamp(1.4rem,3.6vw,2.4rem)] leading-[1.55] mt-7"
                                style={{ color: "var(--mt-accent)" }}
                            >
                                {INVARIANT_HOLD}
                            </p>
                        </div>
                    </Container>
                </div>
            </div>

            {/* ── 채널 장부 ── */}
            <Container className="pb-[88px] md:pb-[140px] pt-10 lg:pt-0">
                <Reveal>
                    <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                        Channel Ledger
                    </p>
                </Reveal>

                <Reveal index={1}>
                    <div className="overflow-x-auto">
                        <table
                            className="w-full border-collapse text-[13.5px]"
                            style={{ minWidth: 560 }}
                        >
                            <thead>
                                <tr>
                                    {["채널", "상태", "비고"].map((h) => (
                                        <th
                                            key={h}
                                            className="mt-en text-left text-[9.5px] font-medium pb-3 pr-6"
                                            style={{
                                                color: "var(--mt-gray)",
                                                borderBottom: "1px solid var(--mt-line)",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {CHANNEL_LEDGER.map((row) => (
                                    <tr key={row.channel}>
                                        <td
                                            className="py-3.5 pr-6 font-medium whitespace-nowrap"
                                            style={{ borderBottom: "1px solid var(--mt-line)", color: "var(--mt-bg)" }}
                                        >
                                            {row.channel}
                                        </td>
                                        <td className="py-3.5 pr-6" style={{ borderBottom: "1px solid var(--mt-line)" }}>
                                            <StatusPill status={row.status} />
                                        </td>
                                        <td
                                            className="py-3.5 text-[12.5px]"
                                            style={{ borderBottom: "1px solid var(--mt-line)", color: "var(--mt-gray)" }}
                                        >
                                            {row.note ?? ""}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Reveal>

                <Reveal index={2}>
                    <p className="mt-8 text-[15px] font-medium" style={{ color: "var(--mt-bg)" }}>
                        {INVARIANT_CLOSE}
                    </p>
                </Reveal>
                <Reveal index={3}>
                    <p className="mt-3 text-[12px]" style={{ color: "var(--mt-gray)" }}>
                        {LEDGER_FOOTNOTE}
                    </p>
                </Reveal>
            </Container>
        </section>
    );
}
