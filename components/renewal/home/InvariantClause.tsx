import { Container } from "../primitives";
import Reveal from "../Reveal";
import {
    INVARIANT_LINES,
    INVARIANT_HOLD,
    INVARIANT_CLOSE,
    CHANNEL_LEDGER,
    LEDGER_FOOTNOTE,
} from "@/data/renewal/site";

// 제3조 — 변해도 조항 (정보 구조 재설계로 압축).
//
// 이전 버전은 230svh sticky 스크롤 시퀀스였다. 리듬은 좋았지만
// 스크롤 2.3화면을 강제했다. 지금은 선언 네 줄이 순차 reveal 로 한 화면에
// 들어오고, 장부가 바로 이어진다. 효과 없이 읽어도 구조가 그대로다.
//
// 채널 장부(ledger)는 §42 원칙의 화면 버전이다:
// 운영 중 / 조건부 / 대기 / 관찰을 구분해 적는다.

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
    return (
        <section
            className="mt-dark-glow py-[88px] md:py-[140px]"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <Container>
                <div className="flex items-center gap-3 mb-12">
                    <span className="mt-en mt-label mt-num" style={{ color: "var(--mt-accent)" }}>
                        제3조
                    </span>
                    <span className="w-6 h-px" style={{ background: "var(--mt-line)" }} />
                    <span className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                        Whatever Changes
                    </span>
                </div>

                {/* ── 선언 — 순차 reveal, 스크롤 강제 없음 ── */}
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

                {/* ── 채널 장부 ── */}
                <div className="mt-16 md:mt-20">
                    <Reveal>
                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                            Channel Ledger
                        </p>
                    </Reveal>

                    <Reveal index={1}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: 560 }}>
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
                </div>
            </Container>
        </section>
    );
}
