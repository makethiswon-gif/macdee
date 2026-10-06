import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CASES, type CaseStudy } from "@/data/renewal/cases";
import {
    CORPORATE_CLIENTS,
    DISCIPLINES,
    FOUNDER,
    LAW_FIRM_PARTNERS,
    TEAM,
    path,
} from "@/data/renewal/site";
import s from "./evidence-spreads.module.css";

/** The roster is one printed sheet. All names remain in normal document flow. */
export function PartnerEdition() {
    return (
        <section className={`${s.section} ${s.partners}`} data-edition-section="clients" aria-labelledby="edition-clients-title">
            <div className={s.inner}>
                <div className={s.roster} data-edition-scene="partner-roster">
                    <header className={s.rosterHeader}>
                        <h2 id="edition-clients-title">Selected<br />Clients</h2>
                        <span className={s.rosterMark} aria-hidden="true">↗</span>
                    </header>
                    <div className={s.legalRoster}>
                        <h3 className={s.label}>법무법인 · 법률사무소</h3>
                        <ul className={s.partnerNames}>
                            {LAW_FIRM_PARTNERS.map((name, index) => (
                                <li key={name}>
                                    <span className={s.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                                    <span>{name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className={s.corporateRoster}>
                        <h3 className={s.label}>기업 고객</h3>
                        <ul>
                            {CORPORATE_CLIENTS.map((name, index) => (
                                <li key={name}>
                                    <span className={s.index} aria-hidden="true">{String(LAW_FIRM_PARTNERS.length + index + 1).padStart(2, "0")}</span>
                                    <span>{name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

function CaseSummary({ caseStudy }: { caseStudy: CaseStudy }) {
    return (
        <div className={s.caseColumns}>
            <div className={s.caseColumn}>
                <h4 className={s.label}>운영 전</h4>
                <ul className={s.caseList}>
                    {caseStudy.before.map(item => <li key={item}>{item}</li>)}
                </ul>
            </div>
            <div className={s.caseColumn}>
                <h4 className={s.label}>한 일</h4>
                <ul className={s.caseList}>
                    {caseStudy.strategy.map(item => <li key={item}>{item}</li>)}
                </ul>
            </div>
            <div className={`${s.caseColumn} ${s.results}`}>
                <h4 className={s.label}>결과</h4>
                <dl>
                    {caseStudy.result.map(item => (
                        <div key={item.metric}>
                            <dt>{item.metric}</dt>
                            <dd>{item.change}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}

function GrowthAccount({ caseStudy }: { caseStudy: CaseStudy }) {
    if (!caseStudy.growth?.length) return null;
    return (
        <div className={s.growthAccount}>
            <h4 className={s.label}>Growth Path — 어떻게 매출로 이어졌나</h4>
            <ol>
                {caseStudy.growth.map((step, index) => (
                    <li key={step.en} data-edition-scene="case-account" className={s.growthStep}>
                        <span className={s.growthNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <div className={s.growthHeading}>
                            <p className={s.label}>{step.en}</p>
                            <h5>{step.title}</h5>
                        </div>
                        <p className={s.growthCopy}>{step.desc}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function CaseDocument({ caseStudy, featured, showGrowth }: {
    caseStudy: CaseStudy;
    featured: boolean;
    showGrowth: boolean;
}) {
    return (
        <article className={`${s.caseDocument} ${featured ? s.featuredCase : ""}`}>
            <div className={s.caseSpread} data-edition-scene={featured ? "case-gatefold" : "case-spread"}>
                <div className={s.casePaper}>
                    <header className={s.caseHeading}>
                        <span className={s.caseLabel}>{caseStudy.label}</span>
                        <h3>{caseStudy.field}</h3>
                    </header>
                    <CaseSummary caseStudy={caseStudy} />
                </div>
                {featured && (
                    <div className={s.gatefold} aria-hidden="true">
                        <div className={`${s.coverLeaf} ${s.coverLeft}`}>
                            <span className={s.coverSmall}>Case Studies</span>
                            <span className={s.coverCase}>{caseStudy.label}</span>
                            <span className={s.coverBottom}>운영 전</span>
                        </div>
                        <div className={`${s.coverLeaf} ${s.coverRight}`}>
                            <span className={s.coverSmall}>MAKETHIS1</span>
                            <span className={s.coverTitle}>{caseStudy.field}</span>
                            <span className={s.coverBottom}>한 일 → 결과</span>
                        </div>
                    </div>
                )}
            </div>
            {caseStudy.note && <p className={s.caseNote}>{caseStudy.note}</p>}
            {showGrowth && <GrowthAccount caseStudy={caseStudy} />}
        </article>
    );
}

/** No invented screenshots: the gatefold opens onto the published case itself. */
export function CaseEdition({
    cases = CASES,
    growthLimit = 1,
    showAllLink = true,
}: {
    cases?: CaseStudy[];
    growthLimit?: number;
    showAllLink?: boolean;
} = {}) {
    if (!cases.length) return null;
    const featuredIndex = cases.findIndex(caseStudy => !caseStudy.isSample);

    return (
        <section className={`${s.section} ${s.cases}`} data-edition-section="cases" aria-labelledby="edition-cases-title">
            <div className={s.inner}>
                <header className={s.sectionHeading}>
                    <p className={s.label}>Case Studies</p>
                    <h2 id="edition-cases-title">이렇게 운영했습니다.</h2>
                </header>
                {cases.some(caseStudy => caseStudy.isSample) && (
                    <div className={s.sampleNote} role="note">
                        <strong>샘플 — 실제 데이터가 아닙니다.</strong>{" "}레이아웃 확인용으로만 표시되며, 성과 수치는 측정된 값이 확인된 사례부터 순차적으로 등록합니다.
                    </div>
                )}
                <div className={s.caseCollection}>
                    {cases.map((caseStudy, index) => (
                        <CaseDocument
                            key={caseStudy.id}
                            caseStudy={caseStudy}
                            featured={index === featuredIndex}
                            showGrowth={index < growthLimit}
                        />
                    ))}
                </div>
                {showAllLink && <Link className={s.editorialLink} href={path("/work")}>전체 사례 보기<span aria-hidden="true">↗</span></Link>}
            </div>
        </section>
    );
}

function FounderSpread() {
    return (
        <article className={s.founderSpread} data-edition-scene="founder-spread" aria-labelledby="edition-founder-title">
            <div className={s.founderPortrait}>
                <Image
                    src={FOUNDER.photo}
                    alt={`${FOUNDER.name} 대표 프로필`}
                    width={700}
                    height={700}
                    sizes="(max-width: 700px) 90vw, 42vw"
                />
            </div>
            <div className={s.founderCopy}>
                <p className={s.label}>Founder</p>
                <div className={s.founderName}>
                    <h3 id="edition-founder-title">{FOUNDER.name}</h3>
                    <span>{FOUNDER.role}</span>
                </div>
                <p className={s.founderLead}>{FOUNDER.lead}</p>
                <div className={s.founderCareer}>
                    <div>
                        <h4 className={s.label}>Legal</h4>
                        <ul>{FOUNDER.career.legal.map(item => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className={s.label}>Marketing</h4>
                        <ul>{FOUNDER.career.marketing.map(item => <li key={item}>{item}</li>)}</ul>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function TeamEdition() {
    return (
        <section className={`${s.section} ${s.team}`} data-edition-section="team" aria-labelledby="edition-team-title">
            <div className={s.inner}>
                <header className={s.sectionHeading}>
                    <p className={s.label}>Why MAKETHIS1</p>
                    <h2 id="edition-team-title">로펌 마케팅을 맡는 사람들.</h2>
                    <p className={s.sectionLead}>기자·방송작가 출신이 쓰고, 법학 전공자가 검수합니다.</p>
                </header>
                <div className={s.teamMasthead}><span>ONE TEAM</span><span aria-hidden="true">↙</span></div>
                <div className={s.contactSheet}>
                    {TEAM.map((member, index) => (
                        <figure
                            key={member.name}
                            className={s.member}
                            data-edition-scene="team-portrait"
                            style={{ "--portrait-offset": index % 3 } as CSSProperties}
                        >
                            <div className={s.portraitMount}>
                                <span className={s.portraitNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                                <div className={s.portraitMask}>
                                    <Image
                                        src={member.photo}
                                        alt={`${member.name} 프로필`}
                                        width={600}
                                        height={600}
                                        sizes="(max-width: 600px) 44vw, (max-width: 900px) 45vw, 30vw"
                                    />
                                </div>
                            </div>
                            <figcaption>
                                <p className={s.memberRole}>{member.role}</p>
                                <h3>{member.name}</h3>
                                <p className={s.memberBackground}>{member.background}</p>
                            </figcaption>
                        </figure>
                    ))}
                </div>
                <ul className={s.disciplines}>
                    {DISCIPLINES.map(discipline => (
                        <li key={discipline.en}>
                            <span className={s.label}>{discipline.en}</span>
                            <span>{discipline.ko}</span>
                        </li>
                    ))}
                </ul>
                <FounderSpread />
                <Link className={s.editorialLink} href={path("/about")}>팀과 회사 소개 보기<span aria-hidden="true">↗</span></Link>
            </div>
        </section>
    );
}
