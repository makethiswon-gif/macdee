import Link from "next/link";
import { HERO_OVERLINE, HERO_BODY, HERO_BEFORE, HERO_CARD_TITLE, HERO_CARD_FOOT, PROOF_STATS, PRIMARY_CTA, SERVICES, path } from "@/data/renewal/site";
import { BOLD_CONCEPTS, type BoldSlug } from "./bold-concepts";
import BoldMotion from "./BoldMotion";
import s from "./bold.module.css";

function Title({ split = false }: { split?: boolean }) {
    return <h1 className={s.title} data-locked-title>
        {split ? <span className={s.splitFirst}><span>로펌 마케팅에 필요한&nbsp;</span><strong>모든&nbsp;것.</strong></span> : <span>로펌 마케팅에 필요한&nbsp;모든&nbsp;것.</span>}
        <span className={s.brandLine}>메이크디스원 하나로</span>
    </h1>;
}
function Actions() {
    return <div className={s.actions} data-locked-actions><Link href={path(PRIMARY_CTA.href)} className={s.primary}>마케팅 진단받기 <span aria-hidden>↗</span></Link><Link href={path("/#plans")} className={s.secondary}>세 가지 운영안 보기 <span aria-hidden>→</span></Link></div>;
}
function Services({ orbit = false }: { orbit?: boolean }) {
    return <ul className={orbit ? s.orbitLabels : s.serviceLinks}>{SERVICES.map(service => <li key={service.no} data-service={service.no}><Link href={path(service.href)}><small>{service.no}</small><span>{service.ko}</span><span aria-hidden>↗</span></Link></li>)}</ul>;
}
function Before() {
    return <p className={s.before}>{HERO_BEFORE.map((word, index) => <span key={word}>{index > 0 && <i aria-hidden> · </i>}<s>{word}</s></span>)}<b aria-hidden>→</b><strong>MAKETHIS1.</strong></p>;
}
function Proof() {
    return <dl className={s.proof}>{PROOF_STATS.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}<span>{stat.suffix}</span></dd></div>)}</dl>;
}
function TypeRibbon({ row }: { row: number }) {
    const pair = SERVICES.slice(row * 2, row * 2 + 2);
    const firstWidth = Math.round(1200 * pair[0].en.length / (pair[0].en.length + pair[1].en.length));
    return <svg viewBox="0 0 1600 155" focusable="false">{pair.map((service, index) => {
        const x = index === 0 ? 30 : firstWidth + 210;
        const width = index === 0 ? firstWidth : 1200 - firstWidth;
        return <g key={service.no}><text x={x} y="125" textLength={width} lengthAdjust="spacingAndGlyphs">{service.en}</text><text x={x + width + 30} y="125">↗</text></g>;
    })}</svg>;
}
function Kinetic() {
    return <section className={`${s.hero} ${s.kinetic}`} data-bold-hero="kinetic" data-motion-state="static">
        <BoldMotion />
        <div className={s.kineticHead}><p className={s.overline}>{HERO_OVERLINE}</p><Title split /></div>
        <div className={s.typeTheatre} data-motion-viewport aria-hidden="true">
            <div className={s.typePerspective} data-motion-part="kinetic-perspective">
                {[0, 1, 2].map(row => <div className={s.typeBelt} key={row} data-motion-part={`kinetic-belt-${row}`}>
                    {[0, 1].map(copy => <TypeRibbon key={copy} row={row} />)}
                </div>)}
            </div>
        </div>
        <div className={s.kineticDeck}><p className={s.body} data-locked-body>{HERO_BODY}</p><Actions /></div>
        <div className={s.kineticScope}><h2>{HERO_CARD_TITLE}</h2><Services /><p className={s.scopeFoot}>{HERO_CARD_FOOT}</p></div>
        <div className={s.bottomLine}><Before /><Proof /></div>
    </section>;
}
function OrbitGraphic() {
    return <div className={s.orbitField} data-motion-viewport aria-hidden="true"><div className={s.orbitTilt} data-motion-part="orbit-parallax">
        <svg className={s.orbitSvg} viewBox="0 0 1000 1000" fill="none">
            <defs><linearGradient id="field-ribbon" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe8d1"/><stop offset=".4" stopColor="#ff915f"/><stop offset=".7" stopColor="#f3b09b"/><stop offset="1" stopColor="#fff4e9"/></linearGradient></defs>
            {SERVICES.map((service, index) => <g key={service.no} className={s.orbitRing} data-wire={service.no} data-motion-part={`orbit-ring-${index}`} style={{ "--ring": index } as React.CSSProperties}>
                <ellipse cx="500" cy="500" rx={425 - index * 37} ry={335 - index * 27} transform={`rotate(${index * 29} 500 500)`} stroke="url(#field-ribbon)" strokeWidth={index % 2 ? 14 : 22} />
                <ellipse cx="500" cy="500" rx={425 - index * 37} ry={335 - index * 27} transform={`rotate(${index * 29} 500 500)`} stroke="#fff6ee" strokeWidth="3" strokeDasharray={`${120 + index * 30} 1900`} className={s.orbitTrace} />
            </g>)}
        </svg>
    </div></div>;
}
function Orbit() {
    return <section className={`${s.hero} ${s.orbit}`} data-bold-hero="orbit" data-motion-state="static">
        <BoldMotion /><OrbitGraphic />
        <div className={s.orbitCopy}><p className={s.overline}>{HERO_OVERLINE}</p><Title /><p className={s.body} data-locked-body>{HERO_BODY}</p><Actions /><Before /></div>
        <div className={s.orbitScope}><h2>{HERO_CARD_TITLE}</h2><Services orbit /><p className={s.scopeFoot}>{HERO_CARD_FOOT}</p></div>
        <div className={s.orbitProof}><Proof /></div>
    </section>;
}
function Aperture() {
    return <section className={`${s.hero} ${s.aperture}`} data-bold-hero="aperture" data-motion-state="static">
        <div className={s.apertureStage}>
            <div className={s.apertureArt} data-motion-viewport aria-hidden="true">
                <div className={s.apertureBase} />
                <div className={s.bladeLeft} data-motion-part="aperture-left" />
                <div className={s.bladeRight} data-motion-part="aperture-right" />
                <div className={s.lightScan} data-motion-part="aperture-scan" />
            </div>
            <BoldMotion />
            <div className={s.apertureCopy}><p className={s.overline}>{HERO_OVERLINE}</p><Title /><p className={s.body} data-locked-body>{HERO_BODY}</p><Actions /></div>
            <div className={s.apertureBottom}><Before /><svg aria-hidden="true" className={s.downArrow} viewBox="0 0 24 50" fill="none"><path d="M12 2V46M3 36L12 46L21 36" stroke="currentColor" strokeWidth="1.6" /></svg></div>
        </div>
        <div className={s.apertureScope}><div><h2>{HERO_CARD_TITLE}</h2><p className={s.scopeFoot}>{HERO_CARD_FOOT}</p></div><Services /><Proof /></div>
    </section>;
}

export default function BoldHero({ slug }: { slug: BoldSlug }) {
    const concept = BOLD_CONCEPTS.find(item => item.slug === slug)!;
    return <div className={`${s.boldPage} ${s[`${slug}Page`]}`}>
        {slug === "kinetic" ? <Kinetic /> : slug === "orbit" ? <Orbit /> : <Aperture />}
        <nav className={s.studyDock} aria-label="두 번째 디자인 시안 비교"><Link href={path("/concepts")} aria-label="두 번째 시안 비교 화면">R2 <span>비교</span></Link>{BOLD_CONCEPTS.map(item => <Link key={item.slug} href={path(`/concepts/${item.slug}`)} aria-label={`${item.letter} ${item.ko} 시안`} aria-current={item.slug === slug ? "page" : undefined}>{item.letter}<span>{item.ko}</span></Link>)}</nav>
        <section className={s.notes}><p>ROUND 02 · 검토용 메모</p><h2>{concept.name}</h2><div className={s.notesGrid}><div><h3>{concept.definition}</h3><p>{concept.signature}</p></div><ol>{concept.principles.map(item => <li key={item}>{item}</li>)}</ol></div><p className={s.risk}>주의할 점 — {concept.risk}</p><Link href={path("/concepts")}>세 시안 비교로 돌아가기 →</Link></section>
    </div>;
}
