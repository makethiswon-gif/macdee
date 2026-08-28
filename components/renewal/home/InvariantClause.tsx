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

// 제3조 — 변해도 조항 (ONE BLUE THREAD 짧은 전환).
//
// 스크롤에 따라 배경의 플랫폼 워드가 차례로 바뀌지만
// 중앙 선언("계약은 하나입니다…")은 고정된다 — 변하는 것과 변하지 않는 것.
// 장부는 행이 하나씩 활성화되고, 상태가 형태로도 읽힌다:
//   운영 중 = 파란 실선 · 조건부 = 점선 · 대기 = 빈 원 · 관찰 = 외곽선.
// enter 진행(--p), sticky 없음. 로고 회전·확대 없음.

const BG_WORDS = ["NAVER", "GOOGLE", "YOUTUBE", "CHATGPT", "GEMINI", "NEW PLATFORM"];

const MARK: Record<string, string> = {
    "운영 중": "mt-lmark-solid",
    조건부: "mt-lmark-dash",
    대기: "mt-lmark-circle",
    관찰: "mt-lmark-outline",
};

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
    const stageRef = useScrollProgress<HTMLDivElement>("enter");

    return (
        <section
            data-clause="제3조"
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
            <div ref={stageRef} className="mt-stage relative overflow-hidden py-[88px] md:py-[140px]">
                {/* 배경 플랫폼 워드 — 장식. 스크롤에 따라 교체된다 */}
                <div aria-hidden="true">
                    {BG_WORDS.map((w, i) => (
                        <span key={w} className="mt-bgword" style={{ ["--i" as string]: i }}>
                            {w}
                        </span>
                    ))}
                </div>

                <Container className="relative">
                    <div className="flex items-center gap-3 mb-12">
                        <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                            제3조
                        </span>
                        <span className="w-6 h-px" style={{ background: "var(--mt-line)" }} />
                        <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                            Whatever Changes
                        </span>
                    </div>

                    {/* 선언 — 고정 문장. 카피 무수정 */}
                    <div>
                        {INVARIANT_LINES.map((line, i) => (
                            <Reveal key={line} index={i} stagger={140}>
                                <p
                                    className="mt-serif font-semibold text-[clamp(1.35rem,3.2vw,2.2rem)] leading-[1.55] m-0"
                                    style={{ color: "var(--mt-gray)" }}
                                >
                                    {line}
                                </p>
                            </Reveal>
                        ))}
                        <Reveal index={INVARIANT_LINES.length} stagger={140}>
                            <p
                                className="mt-serif font-semibold text-[clamp(1.35rem,3.2vw,2.2rem)] leading-[1.55] mt-6"
                                style={{ color: "var(--mt-accent)" }}
                            >
                                {INVARIANT_HOLD}
                            </p>
                        </Reveal>
                    </div>

                    {/* ── 채널 장부 — 행 순차 활성화 ── */}
                    <div className="mt-16 md:mt-20">
                        <Reveal>
                            <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                Channel Ledger
                            </p>
                        </Reveal>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: 560 }}>
                                <thead>
                                    <tr>
                                        {["채널", "상태", "비고"].map((h) => (
                                            <th
                                                key={h}
                                                className="mt-en text-left text-[9.5px] font-medium pb-3 pr-6"
                                                style={{ color: "var(--mt-gray)", borderBottom: "1px solid var(--mt-line)" }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {CHANNEL_LEDGER.map((row, i) => (
                                        <tr
                                            key={row.channel}
                                            className="mt-lrow"
                                            style={{ ["--a" as string]: 0.3 + i * 0.055 }}
                                        >
                                            <td
                                                className="py-3.5 pr-6 font-medium whitespace-nowrap"
                                                style={{ borderBottom: "1px solid var(--mt-line)", color: "var(--mt-bg)" }}
                                            >
                                                <span className={`mt-lmark ${MARK[row.status] ?? ""}`} aria-hidden />
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
                    </div>
                </Container>
            </div>
        </section>
    );
}
