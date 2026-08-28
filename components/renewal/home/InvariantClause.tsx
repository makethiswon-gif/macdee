import { Container } from "../primitives";
import Reveal from "../Reveal";
import {
    NEW_CHANNEL_TITLE,
    NEW_CHANNEL_BODY,
    CHANNEL_LEDGER,
    LEDGER_FOOTNOTE,
} from "@/data/renewal/site";

// 새 채널 대응 — 구 "변해도 조항"을 크게 축소한 버전.
//
// 메시지 하나만 말한다: 새 광고 채널이 생겨도 업체를 다시 찾을 필요가 없다.
// 채널별 상세 현황은 접힌 상세 정보(<details>)로 낮췄다 — 궁금한 사람만 연다.
// ChatGPT Ads 를 메인 판매 문구로 쓰지 않는다(§42 — 허용 여부 미확인).

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
            data-clause="CHANNELS"
            className="mt-dark-glow py-16 md:py-24"
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
                <div className="max-w-[820px]">
                    <Reveal>
                        <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                            New Channels
                        </p>
                    </Reveal>
                    <Reveal index={1}>
                        <h2 className="mt-h2 mt-serif mt-6" style={{ color: "var(--mt-bg)" }}>
                            {NEW_CHANNEL_TITLE[0]}
                            <br />
                            {NEW_CHANNEL_TITLE[1]}
                        </h2>
                    </Reveal>
                    <Reveal index={2}>
                        <p className="mt-body-lg mt-7 max-w-[640px]">{NEW_CHANNEL_BODY}</p>
                    </Reveal>

                    {/* 채널별 현황 — 접힌 상세. 궁금한 사람만 연다 */}
                    <Reveal index={3}>
                        <details className="mt-10 mt-ledger-details">
                            <summary
                                className="inline-flex items-center gap-2 text-[13.5px] font-medium cursor-pointer select-none"
                                style={{ color: "var(--mt-gray)" }}
                            >
                                채널별 운영 현황 보기
                                <span aria-hidden className="mt-ledger-caret text-[11px]">
                                    ▾
                                </span>
                            </summary>

                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: 520 }}>
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
                                        {CHANNEL_LEDGER.map((row) => (
                                            <tr key={row.channel}>
                                                <td
                                                    className="py-3 pr-6 font-medium whitespace-nowrap"
                                                    style={{ borderBottom: "1px solid var(--mt-line)", color: "var(--mt-bg)" }}
                                                >
                                                    {row.channel}
                                                </td>
                                                <td className="py-3 pr-6" style={{ borderBottom: "1px solid var(--mt-line)" }}>
                                                    <StatusPill status={row.status} />
                                                </td>
                                                <td
                                                    className="py-3 text-[12.5px]"
                                                    style={{ borderBottom: "1px solid var(--mt-line)", color: "var(--mt-gray)" }}
                                                >
                                                    {row.note ?? ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="mt-4 text-[12px]" style={{ color: "var(--mt-gray)" }}>
                                {LEDGER_FOOTNOTE}
                            </p>
                        </details>
                    </Reveal>
                </div>
            </Container>
        </section>
    );
}
