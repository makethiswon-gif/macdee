import { Container, Section, SectionHeader } from "../primitives";
import Reveal from "../Reveal";
import { OPERATING_ROLES } from "@/data/renewal/site";

// "하나의 마케팅팀"의 실체.
//
// 이 섹션이 없으면 앞의 주장이 전부 문구로만 남는다.
// 역할 구조만 보여주고 담당자 이름은 붙이지 않는다 — 소기업 특성상 역할을
// 같이 맡기도, 나눠 맡기도 해서 이름을 역할에 고정하면 실제 운영과 어긋난다
// (대표 지시 2026-08-28). 구성원 소개는 첨부 3(팀)이 담당한다.

export default function HowWeOperate() {
    if (!OPERATING_ROLES.length) return null;

    return (
        <Section tight>
            <Container>
                <SectionHeader
                    number="첨부 2"
                    eyebrow="How we operate"
                    title="한 사람이 다 하지 않습니다."
                    lead="대행사에 맡겼을 때 흔히 벌어지는 일은, 담당자 한 명이 광고도 하고 글도 쓰고 보고서도 만드는 것입니다. 그러면 무엇 하나도 깊어지지 않습니다."
                />

                <dl className="mt-14 md:mt-18">
                    {OPERATING_ROLES.map((r, i) => (
                        <Reveal key={r.en} variant="rise" index={i}>
                            <div
                                className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-10 gap-y-4 py-9"
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                            >
                                <dt>
                                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                                        {r.en}
                                    </p>
                                </dt>

                                <dd className="md:col-start-2">
                                    <h3 className="mt-h3">{r.ko}</h3>
                                    <p className="mt-body mt-3.5 max-w-[520px]">{r.scope}</p>
                                </dd>
                            </div>
                        </Reveal>
                    ))}
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                </dl>
            </Container>
        </Section>
    );
}
