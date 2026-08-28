import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { BEFORE_AFTER } from "@/data/renewal/site";

// 제2조 — 맡기기 전 / 맡긴 후 (정보 구조 재설계).
//
// 이전 버전은 260svh 수렴 애니메이션이었다. 멋있지만 이해에 스크롤 2.4화면을
// 요구했다. 같은 내용을 한 화면 비교로 압축한다 — 효과 없이 읽어도
// 왼쪽(분산)과 오른쪽(통합)의 차이가 그대로 구조다.
// 모션은 작은 reveal 뿐. 다크 톤과 세리프 선언은 유지한다.

function Column({
    label,
    items,
    accent = false,
    index = 0,
}: {
    label: string;
    items: string[];
    accent?: boolean;
    index?: number;
}) {
    return (
        <Reveal index={index}>
            <div
                className="h-full px-7 py-9 md:px-9 md:py-11"
                style={{
                    background: "var(--mt-dark-bg)",
                    border: `1px solid ${accent ? "var(--mt-accent)" : "var(--mt-line)"}`,
                }}
            >
                <p
                    className="mt-en mt-label"
                    style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}
                >
                    {label}
                </p>
                <ul className="mt-7 flex flex-col gap-5">
                    {items.map((it) => (
                        <li key={it} className="flex gap-3 text-[14.5px] leading-[1.7]">
                            <span aria-hidden style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
                                {accent ? "―" : "×"}
                            </span>
                            <span style={{ color: accent ? "var(--mt-bg)" : "var(--mt-gray)" }}>{it}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Reveal>
    );
}

export default function ProblemSection() {
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
                <SectionHeader
                    number="제2조"
                    eyebrow="Before · After"
                    serif
                    title={
                        <>
                            파워링크, 블로그, 홈페이지, SEO —
                            <br />
                            왜 전부 다른 업체입니까?
                        </>
                    }
                />

                <div className="mt-14 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    <Column label={BEFORE_AFTER.before.label} items={BEFORE_AFTER.before.items} />
                    <Column label={BEFORE_AFTER.after.label} items={BEFORE_AFTER.after.items} accent index={1} />
                </div>
            </Container>
        </section>
    );
}
