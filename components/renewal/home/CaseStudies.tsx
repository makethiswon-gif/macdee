import { Container, Section, SectionHeader, ArrowLink } from "../primitives";
import Reveal from "../Reveal";
import { path } from "@/data/renewal/site";
import type { CaseStudy } from "@/data/renewal/cases";
import type { CSSProperties, ReactNode } from "react";
import styles from "./editorial-motion.module.css";

// Only the homepage opts into the document treatment. /work keeps its original
// reveal and geometry, while homepage text stays still above animated paper.
function CaseReveal({ children, homeMotion, index = 0, as = "div", className = "" }: {
    children: ReactNode;
    homeMotion: boolean;
    index?: number;
    as?: "div" | "li";
    className?: string;
}) {
    if (!homeMotion) return <Reveal as={as} index={index} className={className}>{children}</Reveal>;
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
}

// Case Study.
// 로고 나열이 아니라 BEFORE → STRATEGY → RESULT 구조로 보여준다.
//
// 데이터가 없으면 섹션 자체가 사라진다. 빈 자리를 지어낸 숫자로 채우지 않는다(§42).
// isSample이 하나라도 있으면 화면에 경고 배너가 강제로 뜬다 — 실수로 배포되어도
// 방문자가 샘플임을 즉시 알 수 있다.

export default function CaseStudies({
    cases,
    growthLimit = Infinity,
    showAllLink = true,
    homeMotion = false,
}: {
    cases: CaseStudy[];
    /** "전체 사례 보기" 링크 — /work 자신에서는 자기 자신으로 가는 링크가 되므로 끈다 */
    showAllLink?: boolean;
    /** Growth Path 타임라인을 앞에서 몇 개 사례까지 펼칠지 — 홈은 1(길이 관리), /work 는 전부 */
    growthLimit?: number;
    /** Homepage-only paper alignment; shared work page remains unchanged. */
    homeMotion?: boolean;
}) {
    if (!cases.length) return null;

    const hasSample = cases.some((c) => c.isSample);

    return (
        <Section data-clause="CASES" className={homeMotion ? styles.caseSection : ""}>
            <Container>
                <SectionHeader
                    eyebrow="Case Studies"
                    serif
                    title="이렇게 운영했습니다."
                />

                {hasSample && (
                    <div
                        className="mt-10 px-5 py-4 text-[13px] leading-relaxed"
                        style={{
                            border: "1px solid #C08A2E",
                            background: "rgba(192,138,46,0.07)",
                            color: "#8A6320",
                        }}
                        role="note"
                    >
                        <strong className="font-semibold">샘플 — 실제 데이터가 아닙니다.</strong> 레이아웃
                        확인용으로만 표시되며, 성과 수치는 측정된 값이 확인된 사례부터 순차적으로 등록합니다.
                    </div>
                )}

                <div className="mt-14 md:mt-20 flex flex-col">
                    {cases.map((c, i) => (
                        <CaseReveal key={c.id} index={i} homeMotion={homeMotion}>
                            <article
                                className={`py-12 md:py-16 ${homeMotion ? styles.caseDocument : ""}`}
                                style={{ borderTop: "1px solid var(--mt-line)" }}
                                data-home-motion={homeMotion ? "case-document" : undefined}
                            >
                                <div className="flex items-baseline gap-4 mb-10">
                                    <span
                                        className="mt-en mt-label mt-num"
                                        style={{ color: "var(--mt-accent)" }}
                                    >
                                        {c.label}
                                    </span>
                                    <span className="w-6 h-px" style={{ background: "var(--mt-line-strong)" }} />
                                    <h3 className="text-[17px] font-semibold">{c.field}</h3>
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 ${homeMotion ? styles.caseGrid : ""}`}>
                                    <div className={homeMotion ? styles.caseColumn : undefined} style={homeMotion ? { "--paper-angle": "-2.4deg", "--paper-shift": "-18px" } as CSSProperties : undefined}>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            운영 전
                                        </p>
                                        <ul className="flex flex-col gap-2.5">
                                            {c.before.map((b) => (
                                                <li key={b} className="mt-body text-[13.5px]">
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className={homeMotion ? styles.caseColumn : undefined} style={homeMotion ? { "--paper-angle": "1.8deg", "--paper-shift": "10px" } as CSSProperties : undefined}>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            한 일
                                        </p>
                                        <ul className="flex flex-col gap-2.5">
                                            {c.strategy.map((s) => (
                                                <li key={s} className="mt-body text-[13.5px]">
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className={homeMotion ? `${styles.caseColumn} ${styles.caseResult}` : undefined} style={homeMotion ? { "--paper-angle": "-1.4deg", "--paper-shift": "20px" } as CSSProperties : undefined}>
                                        <p className="mt-en mt-label mb-5" style={{ color: "var(--mt-gray)" }}>
                                            결과
                                        </p>
                                        <ul className="flex flex-col gap-3">
                                            {c.result.map((r) => (
                                                <li
                                                    key={r.metric}
                                                    className="flex items-baseline justify-between gap-4"
                                                >
                                                    <span className="mt-body text-[13.5px]">{r.metric}</span>
                                                    <span
                                                        className="mt-num text-[14px] font-medium"
                                                        style={{ color: "var(--mt-ink)" }}
                                                    >
                                                        {r.change}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* 어떻게 매출로 이어졌나 — 파란 실을 따라가는 성장 경로 */}
                                {c.growth && c.growth.length > 0 && i < growthLimit && (
                                    <div className="mt-12 md:mt-14">
                                        <p className="mt-en mt-label mb-7" style={{ color: "var(--mt-gray)" }}>
                                            Growth Path — 어떻게 매출로 이어졌나
                                        </p>
                                        <ol className="relative pl-7">
                                            <span
                                                aria-hidden
                                                className="absolute left-[3px] top-2 bottom-3 w-px"
                                                style={{ background: "var(--mt-accent)", opacity: 0.45 }}
                                            />
                                            {c.growth.map((g, gi) => (
                                                <CaseReveal key={g.en} as="li" index={gi} homeMotion={homeMotion} className="relative pb-9 last:pb-0">
                                                    <span
                                                        aria-hidden
                                                        className="absolute -left-7 top-[5px] w-[7px] h-[7px] rounded-full"
                                                        style={{
                                                            background: "var(--mt-accent)",
                                                            boxShadow: "0 0 0 3px rgba(53,99,174,0.14)",
                                                        }}
                                                    />
                                                    <p className="mt-en text-[10.5px] font-medium" style={{ color: "var(--mt-accent)" }}>
                                                        {g.en}
                                                    </p>
                                                    <h4 className="mt-2 text-[15.5px] font-semibold" style={{ color: "var(--mt-ink)" }}>
                                                        {g.title}
                                                    </h4>
                                                    <p className="mt-body mt-2 text-[13.5px] max-w-[64ch]">{g.desc}</p>
                                                </CaseReveal>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {c.note && (
                                    <p
                                        className="mt-10 text-[12.5px] leading-relaxed max-w-[72ch]"
                                        style={{ color: "var(--mt-gray)" }}
                                    >
                                        {c.note}
                                    </p>
                                )}
                            </article>
                        </CaseReveal>
                    ))}
                    <div style={{ borderTop: "1px solid var(--mt-line)" }} />
                </div>

                {showAllLink && (
                    <CaseReveal index={1} homeMotion={homeMotion}>
                        <div className="mt-12">
                            <ArrowLink href={path("/work")}>전체 사례 보기</ArrowLink>
                        </div>
                    </CaseReveal>
                )}
            </Container>
        </Section>
    );
}
