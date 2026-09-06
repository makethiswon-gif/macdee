import Link from "next/link";
import Logo from "../Logo";
import {
    HERO_OVERLINE, HERO_BODY, HERO_BEFORE, HERO_CARD_TITLE,
    HERO_CARD_FOOT, PROOF_STATS, PRIMARY_CTA, SERVICES, path,
} from "@/data/renewal/site";
import type { ConceptSlug } from "./concepts";
import ConceptMotion from "./ConceptMotion";
import s from "./concepts.module.css";

// Exact text, including NBSP, from the approved HeroSection. No new claims.
const FIRST_LINE = "로펌 마케팅에 필요한\u00a0모든\u00a0것.";
const SECOND_LINE = "메이크디스원 하나로";

function Title() {
    return <h1 className={s.title}><span>{FIRST_LINE}</span><span>{SECOND_LINE}</span></h1>;
}

function Actions() {
    return <div className={s.actions}>
        <Link className={s.primary} href={path(PRIMARY_CTA.href)}>마케팅 진단받기 <span aria-hidden>↗</span></Link>
        <Link className={s.secondary} href={path("/#plans")}>세 가지 운영안 보기 <span aria-hidden>→</span></Link>
    </div>;
}

function Before() {
    return <p className={s.before}>
        <span>{HERO_BEFORE.map((word, index) => <span key={word}>
            {index > 0 && <span aria-hidden> · </span>}<s>{word}</s>
        </span>)}</span>
        <span aria-hidden className={s.arrow}>→</span><strong>MAKETHIS1<span aria-hidden>.</span></strong>
    </p>;
}

function Proof() {
    return <dl className={s.proof}>{PROOF_STATS.map(stat => <div key={stat.label}>
        <dt>{stat.label}</dt><dd>{stat.value}<span>{stat.suffix}</span></dd>
    </div>)}</dl>;
}

function ServiceIndex({ className = "" }: { className?: string }) {
    return <ul className={`${s.serviceIndex} ${className}`}>{SERVICES.map(service => <li key={service.no}>
        <Link href={path(service.href)}><span className={s.number}>{service.no}</span><span>{service.ko}</span><span className={s.serviceArrow} aria-hidden>↗</span></Link>
    </li>)}</ul>;
}

function Editorial() {
    return <section className={`${s.hero} ${s.editorial}`} data-concept-hero="editorial" aria-labelledby="concept-hero-label">
        <div className={s.editorialMasthead}><p id="concept-hero-label" className={s.overline}>{HERO_OVERLINE}</p><Logo size={14} /></div>
        <div className={s.editorialSpread}>
            <div className={s.editorialStatement}><Title /></div>
            <div className={s.editorialSpine} aria-hidden><span>1</span><i /></div>
            <div className={s.editorialBrief}><p className={s.body}>{HERO_BODY}</p><Actions /></div>
            <aside className={s.editorialIndex} aria-label={HERO_CARD_TITLE}><h2>{HERO_CARD_TITLE}</h2><ServiceIndex /><p className={s.scopeFoot}>{HERO_CARD_FOOT}</p></aside>
        </div>
        <div className={s.editorialColophon}><Before /><Proof /></div>
    </section>;
}

function Cinema() {
    return <section className={`${s.hero} ${s.cinema}`} data-concept-hero="cinema" aria-labelledby="concept-hero-label">
        <div className={s.cinemaScenery} aria-hidden>
            <div className={s.cinemaOne}>1</div>
            <div className={s.shutters}>{SERVICES.map((service, index) => <i key={service.no} style={{ "--shutter": index - 2.5 } as React.CSSProperties} />)}</div>
            <div className={s.frameCorners}><i /><i /><i /><i /></div>
        </div>
        <div className={s.cinemaStatement}><p id="concept-hero-label" className={s.overline}>{HERO_OVERLINE}</p><Title /><p className={s.body}>{HERO_BODY}</p><Actions /></div>
        <div className={s.cinemaSequence}><div className={s.sequenceLegend}><h2>{HERO_CARD_TITLE}</h2><p>{HERO_CARD_FOOT}</p></div><ServiceIndex /></div>
        <div className={s.cinemaColophon}><Before /><Proof /></div>
    </section>;
}

function Blueprint() {
    return <section className={`${s.hero} ${s.blueprint}`} data-concept-hero="blueprint" aria-labelledby="concept-hero-label">
        <div className={s.blueprintHeading}><div><p id="concept-hero-label" className={s.overline}>{HERO_OVERLINE}</p><Title /></div><div className={s.blueprintBrief}><p className={s.body}>{HERO_BODY}</p><Actions /></div></div>
        <div className={s.planLegend}><h2>{HERO_CARD_TITLE}</h2><p>{HERO_CARD_FOOT}</p></div>
        <div className={s.routingPlan}>
            <svg className={s.wiring} viewBox="0 0 1200 288" preserveAspectRatio="none" fill="none" aria-hidden>
                <path data-wire="01" d="M260 48 H410 L490 144 H550" />
                <path data-wire="02" d="M260 144 H550" />
                <path data-wire="03" d="M260 240 H410 L490 144 H550" />
                <path data-wire="04" d="M650 144 H710 L790 48 H940" />
                <path data-wire="05" d="M650 144 H940" />
                <path data-wire="06" d="M650 144 H710 L790 240 H940" />
            </svg>
            <div className={s.hub}><span aria-hidden className={s.hubOne}>1</span><Logo size={18} /></div>
            <ul className={s.planNodes}>{SERVICES.map(service => <li key={service.no} data-node={service.no}>
                <Link href={path(service.href)}><span className={s.number}>{service.no}</span><span>{service.ko}</span><span aria-hidden>↗</span></Link>
            </li>)}</ul>
        </div>
        <div className={s.blueprintColophon}><Before /><Proof /></div>
    </section>;
}

export default function ConceptHero({ concept }: { concept: ConceptSlug }) {
    return <><ConceptMotion />{concept === "editorial" ? <Editorial /> : concept === "cinema" ? <Cinema /> : <Blueprint />}</>;
}
