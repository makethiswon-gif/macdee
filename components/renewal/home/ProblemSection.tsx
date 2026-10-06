import { Container, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { BEFORE_AFTER } from "@/data/renewal/site";
import { OperationsScene } from "./OperationsScene";

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
                <p className="mt-en mt-label" style={{ color: accent ? "var(--mt-accent)" : "var(--mt-gray)" }}>
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
            data-clause="BEFORE · AFTER"
            className="mt-k-before mt-dark-glow py-[88px] md:py-[140px]"
            style={{
                background: "var(--mt-dark-bg)",
                color: "var(--mt-bg)",
                ["--mt-gray" as string]: "var(--mt-dark-gray)",
                ["--mt-line" as string]: "var(--mt-dark-line)",
                ["--mt-ink" as string]: "var(--mt-bg)",
                ["--mt-accent" as string]: "var(--mt-accent-on-dark)",
            }}
        >
            <div>
                <Container>
                    <SectionHeader
                        eyebrow="Before · After"
                        serif
                        title={BEFORE_AFTER.title.map((line, i) => (
                            <span key={line} className={i > 0 ? "block" : undefined}>
                                {line}
                            </span>
                        ))}
                    />

                    <OperationsScene />

                    <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Column label={BEFORE_AFTER.before.label} items={BEFORE_AFTER.before.items} />
                        <Column label={BEFORE_AFTER.after.label} items={BEFORE_AFTER.after.items} accent index={1} />
                    </div>
                </Container>
            </div>
        </section>
    );
}
