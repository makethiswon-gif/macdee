import { Container, Section, Eyebrow, Stat } from "../primitives";
import Reveal from "../Reveal";
import PartnerGroups from "../PartnerGroups";
import { PROOF_STATS } from "@/data/renewal/site";

// SECTION 09 — Brand Proof.
// 슬라이더로 굴리지 않는다. Selected Clients 목록으로 담담하게.
// 법무법인·법률사무소와 기업 고객을 나눠 보여준다(PartnerGroups).
// 수치는 이미 대외 공표 중인 값만 쓴다(§9, §42).

export default function PartnerLogos() {
    return (
        <Section tight>
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
                    <div>
                        <Reveal>
                            <Eyebrow>Selected Clients</Eyebrow>
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
                        <PartnerGroups />
                    </Reveal>
                </div>
            </Container>
        </Section>
    );
}
