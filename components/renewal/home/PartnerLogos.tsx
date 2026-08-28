import { Container, Section, Eyebrow } from "../primitives";
import Reveal from "../Reveal";
import { LAW_FIRM_PARTNERS, CORPORATE_CLIENTS } from "@/data/renewal/site";

// Selected Clients — 계약서 색인 (ONE BLUE THREAD, 1회 실행형).
//
// 마키·자동 스크롤 금지. 고객명이 색인처럼 한 행씩 등록되고 멈춘다.
// 각 행: 색인 번호 + 파란 점 + 실명(데이터 무수정).
// 화면 진입 시 한 번만(IntersectionObserver 리빌), 이후 정지.

function IndexGroup({
    title,
    names,
    startIndex,
    baseDelay = 0,
}: {
    title: string;
    names: readonly string[];
    startIndex: number;
    baseDelay?: number;
}) {
    return (
        <div>
            <Reveal variant="rise" index={baseDelay}>
                <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                    {title}
                </p>
            </Reveal>
            <Reveal variant="line" index={baseDelay}>
                <span className="block h-px w-full" style={{ background: "var(--mt-line-strong)" }} />
            </Reveal>
            <ul className="mt-1 columns-1 sm:columns-2 xl:columns-3 gap-x-10">
                {names.map((name, i) => (
                    <Reveal
                        key={name}
                        as="li"
                        variant="rise"
                        index={baseDelay + i}
                        stagger={65}
                        className="break-inside-avoid"
                    >
                        <span
                            className="flex items-baseline gap-3 py-[9px] text-[14px]"
                            style={{ borderBottom: "1px solid var(--mt-line)" }}
                        >
                            <span className="mt-en mt-num text-[9.5px]" style={{ color: "var(--mt-gray-light)" }}>
                                {String(startIndex + i).padStart(2, "0")}
                            </span>
                            <span
                                aria-hidden
                                className="w-[5px] h-[5px] rounded-full self-center shrink-0"
                                style={{ background: "var(--mt-accent)" }}
                            />
                            <span style={{ color: "var(--mt-ink)" }}>{name}</span>
                        </span>
                    </Reveal>
                ))}
            </ul>
        </div>
    );
}

export default function PartnerLogos() {
    return (
        <Section tight data-clause="색인">
            <Container>
                <Reveal>
                    <Eyebrow>Selected Clients</Eyebrow>
                </Reveal>

                <div className="mt-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-x-16 gap-y-12">
                    <IndexGroup title="법무법인 · 법률사무소" names={LAW_FIRM_PARTNERS} startIndex={1} />
                    <IndexGroup
                        title="기업 고객"
                        names={CORPORATE_CLIENTS}
                        startIndex={LAW_FIRM_PARTNERS.length + 1}
                        baseDelay={2}
                    />
                </div>
            </Container>
        </Section>
    );
}
