import { Container, Section, Eyebrow, Stat } from "../primitives";
import Reveal from "../Reveal";
import { PARTNERS, PROOF_STATS } from "@/data/renewal/site";

// SECTION 09 — Brand Proof.
// 슬라이더로 굴리지 않는다. Selected Partners 목록으로 담담하게.
// 수치는 이미 대외 공표 중인 값만 쓴다(§9, §42).

export default function PartnerLogos() {
    return (
        <Section tight>
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
                    <div>
                        <Reveal>
                            <Eyebrow>Selected Partners</Eyebrow>
                        </Reveal>

                        <Reveal index={1}>
                            <div className="mt-10 flex flex-row lg:flex-col gap-10 lg:gap-8 flex-wrap">
                                {PROOF_STATS.map((s) => (
                                    <Stat key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    <Reveal index={2}>
                        <ul
                            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-px"
                            style={{ background: "var(--mt-line)" }}
                        >
                            {PARTNERS.map((p) => (
                                <li
                                    key={p}
                                    className="flex items-center justify-center px-4 py-7 text-[13px] text-center"
                                    style={{ background: "var(--mt-bg)", color: "var(--mt-gray)" }}
                                >
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                </div>
            </Container>
        </Section>
    );
}
