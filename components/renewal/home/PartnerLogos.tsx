import { Container, Section, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import PartnerGroups from "../PartnerGroups";

// Brand Proof — Selected Clients.
// 슬라이더로 굴리지 않는다. 목록으로 담담하게.
// 법무법인·법률사무소와 기업 고객을 나눠 보여준다(PartnerGroups).
// 공표 수치(20+/100+/7년+)는 히어로가 맡는다 — 같은 숫자를 두 번 쓰지 않는다.

export default function PartnerLogos() {
    return (
        <Section tight>
            <Container>
                <Reveal>
                    <Eyebrow>Selected Clients</Eyebrow>
                </Reveal>

                <Reveal index={1}>
                    <div className="mt-10">
                        <PartnerGroups />
                    </div>
                </Reveal>
            </Container>
        </Section>
    );
}
